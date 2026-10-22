"use client"

import { useRealtimeRefresh } from "@/lib/use-realtime-refresh"
import { cn } from "@/lib/utils"

/**
 * Realtime sobre citas, recetas y lotes: cualquier cambio en otro dispositivo (agendar, atender,
 * dispensar, ingresar stock) vuelve a pedir el tablero. Muestra el indicador "En vivo".
 */
export function LiveStatus() {
  const live = useRealtimeRefresh(["appointments", "prescriptions", "stock_lots"])

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-sm", live ? "text-ok" : "text-muted-foreground")}
      title={live ? "Se actualiza solo con cada cita, atención o dispensación" : "Conectando…"}
    >
      <span className={cn("size-2 rounded-full", live ? "animate-pulse bg-ok" : "bg-muted-foreground/50")} />
      {live ? "En vivo" : "Conectando…"}
    </span>
  )
}
