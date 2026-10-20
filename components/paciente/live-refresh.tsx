"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { supabase } from "@/lib/supabase"

/**
 * Refresca la pantalla cuando cambian las citas o recetas del paciente en otro dispositivo
 * (p. ej. el médico emite la receta o Farmacia la entrega). Realtime de Supabase.
 */
export function LiveRefresh({ patientId }: { patientId: string }) {
  const router = useRouter()

  useEffect(() => {
    const filter = `patient_id=eq.${patientId}`
    const channel = supabase
      .channel(`paciente-${patientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "prescriptions", filter }, () => router.refresh())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [patientId, router])

  return null
}
