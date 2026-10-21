"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { Database } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"

// Escrituras de Farmacia: SOLO por RPC. Los errores de la BD vuelven tal cual (español).

export type DispenseLineResult = {
  item_id: string
  medication_code: string
  requested: number
  dispensed: number
  shortage: number
}
export type DispenseResult = {
  folio: string
  status: Database["public"]["Enums"]["prescription_status"]
  lines: DispenseLineResult[]
}

const linesSchema = z.array(
  z.object({
    item_id: z.uuid(),
    quantity: z.int("Ingrese una cantidad entera").min(0, "La cantidad no puede ser negativa"),
  }),
)

/** Dispensa la receta por lotes FEFO (dispense_prescription). Devuelve lo entregado y el faltante por línea. */
export async function dispensePrescription(
  prescriptionId: string,
  lines: { item_id: string; quantity: number }[],
): Promise<{ ok: true; result: DispenseResult } | { ok: false; error: string }> {
  if (!z.uuid().safeParse(prescriptionId).success) return { ok: false, error: "Receta no válida" }
  const parsed = linesSchema.safeParse(lines)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const { data, error } = await supabase.rpc("dispense_prescription", {
    p_prescription_id: prescriptionId,
    p_lines: parsed.data,
  })
  if (error) return { ok: false, error: error.message }

  // Bandeja, inventario, indicadores y la receta en la app del paciente.
  revalidatePath("/", "layout")
  return { ok: true, result: data as unknown as DispenseResult }
}

const receiveSchema = z.object({
  medicationCode: z.string().min(1, "Elija un medicamento"),
  lotNumber: z.string().trim().min(1, "Ingrese el número de lote").max(40, "Lote demasiado largo"),
  expiresAt: z.iso.date("Ingrese la fecha de vencimiento"),
  quantity: z.int("Ingrese una cantidad entera").positive("La cantidad debe ser mayor a cero"),
})

/** Ingreso de stock (receive_stock): crea el lote o suma al existente y deja el movimiento en el kardex. */
export async function receiveStock(
  values: z.input<typeof receiveSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = receiveSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const { error } = await supabase.rpc("receive_stock", {
    p_medication_code: parsed.data.medicationCode,
    p_lot_number: parsed.data.lotNumber,
    p_expires_at: parsed.data.expiresAt,
    p_quantity: parsed.data.quantity,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath("/", "layout")
  return { ok: true }
}

/** Baja de un lote vencido (write_off_expired_lot): el saldo sale del inventario con movimiento de baja. */
export async function writeOffExpiredLot(lotId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!z.uuid().safeParse(lotId).success) return { ok: false, error: "Lote no válido" }

  const { error } = await supabase.rpc("write_off_expired_lot", { p_lot_id: lotId })
  if (error) return { ok: false, error: error.message }

  revalidatePath("/", "layout")
  return { ok: true }
}
