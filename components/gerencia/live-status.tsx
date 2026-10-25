"use client"

import { TodayLine } from "@/components/layout/today-line"
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh"

/**
 * Fecha del tablero con "En vivo". Realtime sobre citas, recetas y lotes: cualquier cambio en otro
 * dispositivo (agendar, atender, dispensar, ingresar stock) vuelve a pedir el tablero.
 */
export function LiveStatus({ today }: { today: string }) {
  const live = useRealtimeRefresh(["appointments", "prescriptions", "stock_lots"])
  return (
    <TodayLine
      today={today}
      live={live}
      liveTitle="Se actualiza solo con cada cita, atención o dispensación"
      className="text-lg"
    />
  )
}
