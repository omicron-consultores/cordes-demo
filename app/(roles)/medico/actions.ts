"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { encounterSchema, fieldErrors, type EncounterFormValues } from "@/lib/encounter-schema"
import { supabase } from "@/lib/supabase"

// Escrituras del Médico: SOLO por RPC. Los errores de la BD vuelven tal cual (español).

export type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Inicia (o reabre: la RPC es idempotente) la atención de una cita y lleva a la pantalla de atención.
 * Solo devuelve algo si falla; si no, redirige.
 */
export async function startEncounter(appointmentId: string): Promise<{ error: string }> {
  if (!z.uuid().safeParse(appointmentId).success) return { error: "Cita no válida" }

  const { data: encounterId, error } = await supabase.rpc("start_encounter", { p_appointment_id: appointmentId })
  if (error) return { error: error.message }

  // La cita pasa a "En consulta" también en Admisión y en la app del paciente.
  revalidatePath("/", "layout")
  redirect(`/medico/atencion/${encounterId}`)
}

/** Cierra la atención (complete_encounter): la cita queda "Atendida". */
export async function completeEncounter(encounterId: string, values: EncounterFormValues): Promise<ActionResult> {
  if (!z.uuid().safeParse(encounterId).success) return { ok: false, error: "Atención no válida" }

  const parsed = encounterSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: Object.values(fieldErrors(parsed.error))[0] ?? "Revise los datos" }

  const { error } = await supabase.rpc("complete_encounter", { p_encounter_id: encounterId, p_data: parsed.data })
  if (error) return { ok: false, error: error.message }

  // Agenda del médico, Admisión, historial del paciente e indicadores.
  revalidatePath("/", "layout")
  return { ok: true }
}
