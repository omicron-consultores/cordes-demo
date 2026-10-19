import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Cliente único para servidor y navegador. Sin login: usa la publishable key (rol anon).
// Las escrituras de negocio van SOLO por RPC (ver CLAUDE.md).

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local",
  )
}

export const supabase = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"]
