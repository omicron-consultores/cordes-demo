"use client"

import { useRealtimeRefresh } from "@/lib/use-realtime-refresh"

/**
 * Refresca la pantalla cuando cambian las citas o recetas del paciente en otro dispositivo
 * (p. ej. el médico emite la receta o Farmacia la entrega). Realtime de Supabase.
 */
export function LiveRefresh({ patientId }: { patientId: string }) {
  useRealtimeRefresh(["appointments", "prescriptions"], { filter: `patient_id=eq.${patientId}` })
  return null
}
