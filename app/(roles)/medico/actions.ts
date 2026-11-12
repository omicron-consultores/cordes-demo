"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import {
  encounterSchema,
  fieldErrors,
  prescriptionSchema,
  type EncounterFormValues,
  type PrescriptionLineValues,
} from "@/lib/encounter-schema"
import { supabase } from "@/lib/supabase"

// Escrituras del Médico: SOLO por RPC. Los errores de la BD vuelven tal cual (español).

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

/**
 * Cierra la atención (complete_encounter): la cita queda "Atendida" y, si hay medicamentos,
 * se emite la receta, que entra en la bandeja de Farmacia. Devuelve el folio ("RX-000123") o null.
 */
export async function completeEncounter(
  encounterId: string,
  values: EncounterFormValues,
  lines: PrescriptionLineValues[],
): Promise<{ ok: true; folio: string | null } | { ok: false; error: string }> {
  if (!z.uuid().safeParse(encounterId).success) return { ok: false, error: "Atención no válida" }

  const parsed = encounterSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: Object.values(fieldErrors(parsed.error))[0] ?? "Revise los datos" }
  const items = prescriptionSchema.safeParse(lines)
  if (!items.success) return { ok: false, error: items.error.issues[0].message }

  const { data: prescriptionId, error } = await supabase.rpc("complete_encounter", {
    p_encounter_id: encounterId,
    p_data: parsed.data,
    p_items: items.data.map((item) => ({ ...item, allergy_override: undefined })), // solo para p_notes
    p_notes: await allergyNote(items.data.filter((i) => i.allergy_override).map((i) => i.medication_code)),
  })
  if (error) return { ok: false, error: error.message }

  // Agenda del médico, Admisión, Farmacia, historial del paciente e indicadores.
  revalidatePath("/", "layout")
  if (!prescriptionId) return { ok: true, folio: null }

  const { data: rx } = await supabase
    .from("v_prescription_queue")
    .select("folio_label")
    .eq("id", prescriptionId)
    .maybeSingle()
  return { ok: true, folio: rx?.folio_label ?? null }
}

/**
 * Botón de demo "Registrar resultado (simulado)": el laboratorio o Radiología informa el estudio
 * (register_simulated_result). Devuelve el nombre del estudio y si quedó algo fuera de rango.
 */
export async function registerSimulatedResult(
  orderId: string,
): Promise<{ ok: true; study: string; abnormal: number } | { ok: false; error: string }> {
  if (!z.uuid().safeParse(orderId).success) return { ok: false, error: "Estudio no válido" }

  const { error } = await supabase.rpc("register_simulated_result", { p_order_id: orderId })
  if (error) return { ok: false, error: error.message }

  revalidatePath("/medico/atencion/[id]", "page")
  const { data } = await supabase
    .from("v_diagnostic_orders")
    .select("study_name, abnormal_count")
    .eq("id", orderId)
    .maybeSingle()
  return { ok: true, study: data?.study_name ?? "Estudio", abnormal: data?.abnormal_count ?? 0 }
}

/** Constancia para Farmacia cuando el médico confirmó recetar pese a una alergia. */
async function allergyNote(codes: string[]): Promise<string | undefined> {
  if (!codes.length) return undefined
  const { data } = await supabase.from("v_medication_stock").select("name, allergen_group").in("code", codes)
  const meds = (data ?? []).map((m) => `${m.name} (${m.allergen_group})`)
  return `Recetado pese a alergia registrada, con confirmación del médico: ${meds.join(", ")}.`
}
