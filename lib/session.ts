import { cookies } from "next/headers"
import { cache } from "react"
import { DEFAULT_DOCTOR, DEFAULT_PATIENT, DOCTOR_COOKIE, PATIENT_COOKIE, type Role } from "./roles"
import { supabase } from "./supabase"

// Sesión de demo (sin login): el rol lo define la ruta; la persona (paciente y médico)
// se guarda en cookies independientes, con María Elena y el Dr. Villarroel por defecto.
// Leer cookies es una API de request: usar dentro de <Suspense> (cacheComponents).

export type CurrentPatient = { id: string; matricula: string; name: string }
export type CurrentDoctor = { id: string; license_number: string; name: string }

/** Paciente elegido (o el protagonista si no hay cookie o ya no existe). Una consulta por request. */
export const getCurrentPatient = cache(async (): Promise<CurrentPatient | null> => {
  const key = (await cookies()).get(PATIENT_COOKIE)?.value
  return (await findPatient(key)) ?? (key !== DEFAULT_PATIENT ? findPatient(DEFAULT_PATIENT) : null)
})

/** Médico elegido (o el Dr. Villarroel si no hay cookie o ya no existe). Una consulta por request. */
export const getCurrentDoctor = cache(async (): Promise<CurrentDoctor | null> => {
  const key = (await cookies()).get(DOCTOR_COOKIE)?.value
  return (await findDoctor(key)) ?? (key !== DEFAULT_DOCTOR ? findDoctor(DEFAULT_DOCTOR) : null)
})

/** Nombre visible de la persona del rol (solo paciente y médico), o null. */
export async function getActorName(role: Role): Promise<string | null> {
  if (role === "paciente") return (await getCurrentPatient())?.name ?? null
  if (role === "medico") return (await getCurrentDoctor())?.name ?? null
  return null
}

async function findPatient(matricula: string | undefined): Promise<CurrentPatient | null> {
  if (!matricula) return null
  const { data } = await supabase
    .from("patients")
    .select("id, matricula, first_names, last_names")
    .eq("matricula", matricula)
    .maybeSingle()
  return data ? { id: data.id, matricula: data.matricula, name: `${data.first_names} ${data.last_names}` } : null
}

async function findDoctor(license: string | undefined): Promise<CurrentDoctor | null> {
  if (!license) return null
  const { data } = await supabase
    .from("doctors")
    .select("id, license_number, full_name")
    .eq("license_number", license)
    .maybeSingle()
  return data ? { id: data.id, license_number: data.license_number, name: data.full_name } : null
}
