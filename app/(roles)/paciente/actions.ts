"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getCurrentPatient } from "@/lib/session"
import { supabase } from "@/lib/supabase"

// Escrituras de citas del paciente: SOLO por RPC. Los errores de la BD vuelven tal cual (español).

export type ActionResult = { ok: true } | { ok: false; error: string }

const bookSchema = z.object({
  doctorId: z.uuid(),
  scheduledAt: z.iso.datetime({ offset: true }),
  reason: z.string().trim().max(300).optional(),
})

export async function bookAppointment(input: z.input<typeof bookSchema>): Promise<ActionResult> {
  const parsed = bookSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Datos de la cita incompletos" }

  const patient = await getCurrentPatient()
  if (!patient) return { ok: false, error: "No se encontró al paciente" }

  const { doctorId, scheduledAt, reason } = parsed.data
  const { error } = await supabase.rpc("book_appointment", {
    p_patient_id: patient.id,
    p_doctor_id: doctorId,
    p_scheduled_at: scheduledAt,
    p_reason: reason || undefined,
    p_channel: "app",
  })
  return done(error)
}

const rescheduleSchema = z.object({ appointmentId: z.uuid(), newAt: z.iso.datetime({ offset: true }) })

export async function rescheduleAppointment(input: z.input<typeof rescheduleSchema>): Promise<ActionResult> {
  const parsed = rescheduleSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Elija un nuevo horario" }

  const { error } = await supabase.rpc("reschedule_appointment", {
    p_appointment_id: parsed.data.appointmentId,
    p_new_at: parsed.data.newAt,
  })
  return done(error)
}

export async function cancelAppointment(appointmentId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(appointmentId).success) return { ok: false, error: "Cita no válida" }

  const { error } = await supabase.rpc("cancel_appointment", {
    p_appointment_id: appointmentId,
    p_reason: "Cancelada por el paciente desde la app",
  })
  return done(error)
}

function done(error: { message: string } | null): ActionResult {
  if (error) return { ok: false, error: error.message }
  // La agenda del médico y de Admisión también muestran estas citas.
  revalidatePath("/", "layout")
  return { ok: true }
}
