"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { supabase } from "@/lib/supabase"

// Escrituras de Admisión: SOLO por RPC. Los errores de la BD vuelven tal cual (español).

export type ActionResult = { ok: true } | { ok: false; error: string }

const bookSchema = z.object({
  patientId: z.uuid(),
  doctorId: z.uuid(),
  scheduledAt: z.iso.datetime({ offset: true }),
  reason: z.string().trim().max(300).optional(),
})

/** Cita agendada en ventanilla (canal 'ventanilla'). */
export async function bookAtWindow(input: z.input<typeof bookSchema>): Promise<ActionResult> {
  const parsed = bookSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Elija paciente, médico y horario" }

  const { patientId, doctorId, scheduledAt, reason } = parsed.data
  const { error } = await supabase.rpc("book_appointment", {
    p_patient_id: patientId,
    p_doctor_id: doctorId,
    p_scheduled_at: scheduledAt,
    p_reason: reason || undefined,
    p_channel: "ventanilla",
  })
  return done(error)
}

export async function markNoShow(appointmentId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(appointmentId).success) return { ok: false, error: "Cita no válida" }

  const { error } = await supabase.rpc("mark_no_show", { p_appointment_id: appointmentId })
  return done(error)
}

function done(error: { message: string } | null): ActionResult {
  if (error) return { ok: false, error: error.message }
  // La cita también aparece en la agenda del médico y en la app del paciente.
  revalidatePath("/", "layout")
  return { ok: true }
}
