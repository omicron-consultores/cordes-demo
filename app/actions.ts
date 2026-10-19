"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ACTOR_COOKIE, ROLE_COOKIE, defaultActor, isRole, needsActor } from "@/lib/roles"
import { supabase } from "@/lib/supabase"

const COOKIE_OPTIONS = { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 } as const

/** Guarda rol (y persona, si aplica) y entra a la pantalla del rol. */
export async function chooseRole(role: string, actor?: string) {
  if (!isRole(role)) throw new Error("Rol no válido")

  const store = await cookies()
  store.set(ROLE_COOKIE, role, COOKIE_OPTIONS)
  if (needsActor(role)) {
    store.set(ACTOR_COOKIE, actor || defaultActor(role)!, COOKIE_OPTIONS)
  } else {
    store.delete(ACTOR_COOKIE)
  }
  redirect(`/${role}`)
}

/** Restaura todos los datos de la demo (reset_demo). Devuelve el error de la BD tal cual. */
export async function resetDemo(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("reset_demo")
  if (error) return { ok: false, error: error.message }
  revalidatePath("/", "layout")
  return { ok: true }
}
