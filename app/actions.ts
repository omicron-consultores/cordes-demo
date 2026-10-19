"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { DOCTOR_COOKIE, PATIENT_COOKIE } from "@/lib/roles"
import { supabase } from "@/lib/supabase"

const COOKIE_OPTIONS = { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 } as const

/** Guarda el paciente elegido (matrícula) y entra a su pantalla. */
export async function choosePatient(matricula: string) {
  if (!matricula) throw new Error("Paciente no válido")
  ;(await cookies()).set(PATIENT_COOKIE, matricula, COOKIE_OPTIONS)
  redirect("/paciente")
}

/** Guarda el médico elegido (matrícula profesional) y entra a su agenda. */
export async function chooseDoctor(license: string) {
  if (!license) throw new Error("Médico no válido")
  ;(await cookies()).set(DOCTOR_COOKIE, license, COOKIE_OPTIONS)
  redirect("/medico")
}

/** Restaura todos los datos de la demo (reset_demo). Devuelve el error de la BD tal cual. */
export async function resetDemo(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("reset_demo")
  if (error) return { ok: false, error: error.message }
  revalidatePath("/", "layout")
  return { ok: true }
}
