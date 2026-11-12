"use client"

import { useRealtimeRefresh } from "@/lib/use-realtime-refresh"

/**
 * Refresca la pantalla cuando cambian las citas, recetas o exámenes del paciente en otro dispositivo
 * (p. ej. el médico emite la receta, Farmacia la entrega o llega un resultado). Realtime de Supabase.
 */
export function LiveRefresh({ patientId }: { patientId: string }) {
  useRealtimeRefresh(["appointments", "prescriptions", "diagnostic_orders"], { filter: `patient_id=eq.${patientId}` })
  return null
}
