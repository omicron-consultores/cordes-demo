"use client"

import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { supabase, type Tables } from "./supabase"

/** Tablas publicadas en Realtime (migración …02_logic.sql): suscribirse a otra no recibe nada. */
export type RealtimeTable = "appointments" | "prescriptions" | "stock_lots"

export type RealtimeChange = RealtimePostgresChangesPayload<Tables<RealtimeTable>>

const DEBOUNCE_MS = 500

/**
 * Se suscribe a los cambios de esas tablas y vuelve a pedir la página (`router.refresh()`):
 * así cada pantalla refleja lo que se hizo en otro dispositivo. Una acción toca varias filas
 * (p. ej. dispensar descuenta de varios lotes), por eso los cambios se agrupan en un solo refresco.
 *
 * - `filter`: filtro de Realtime aplicado a todas las tablas, p. ej. `patient_id=eq.<uuid>`.
 * - `onChange`: para efectos extra por cambio (resaltar filas nuevas, toasts); no reemplaza el refresco.
 *
 * Devuelve `true` mientras la suscripción está activa (indicador "En vivo").
 */
export function useRealtimeRefresh(
  tables: RealtimeTable[],
  { filter, onChange }: { filter?: string; onChange?: (change: RealtimeChange) => void } = {},
): boolean {
  const router = useRouter()
  const id = useId()
  const [live, setLive] = useState(false)
  const onChangeRef = useRef(onChange)
  const key = [...tables].sort().join(",") // los arreglos literales cambian en cada render

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const handle = (change: RealtimeChange) => {
      clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), DEBOUNCE_MS)
      onChangeRef.current?.(change)
    }

    // Nombre único por instancia: supabase-js reutiliza los canales con el mismo nombre.
    let channel = supabase.channel(`refresh:${key}:${filter ?? "*"}:${id}`)
    for (const table of key.split(",") as RealtimeTable[]) {
      channel = channel.on<Tables<RealtimeTable>>(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(filter && { filter }) },
        handle,
      )
    }
    channel.subscribe((state) => setLive(state === "SUBSCRIBED"))

    return () => {
      clearTimeout(timer)
      setLive(false)
      supabase.removeChannel(channel)
    }
  }, [key, filter, id, router])

  return live
}
