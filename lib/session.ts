import { cookies } from "next/headers"
import { ACTOR_COOKIE, ROLE_COOKIE, isRole, needsActor, type Role } from "./roles"
import { supabase } from "./supabase"

// Sesión de demo (sin login): rol y persona elegidos en "/", guardados en cookies.
// Leer cookies es una API de request: usar dentro de <Suspense> (cacheComponents).

export type DemoSession = { role: Role | null; actor: string | null }

export async function getSession(): Promise<DemoSession> {
  const store = await cookies()
  const role = store.get(ROLE_COOKIE)?.value
  if (!isRole(role)) return { role: null, actor: null }
  return { role, actor: needsActor(role) ? (store.get(ACTOR_COOKIE)?.value ?? null) : null }
}

/** Nombre visible de la persona elegida (paciente o médico), o null. */
export async function getActorName({ role, actor }: DemoSession): Promise<string | null> {
  if (!actor) return null
  if (role === "paciente") {
    const { data } = await supabase
      .from("patients")
      .select("first_names, last_names")
      .eq("matricula", actor)
      .maybeSingle()
    return data ? `${data.first_names} ${data.last_names}` : null
  }
  if (role === "medico") {
    const { data } = await supabase
      .from("doctors")
      .select("full_name")
      .eq("license_number", actor)
      .maybeSingle()
    return data?.full_name ?? null
  }
  return null
}
