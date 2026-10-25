"use client"

import { useSyncExternalStore } from "react"
import { BatteryFull, Signal, Wifi } from "lucide-react"
import { formatTime } from "@/lib/format"

// Hora de Bolivia, al minuto; en el servidor no hay hora (se completa al hidratar).
const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 15_000)
  return () => clearInterval(id)
}

/** Barra de estado falsa: en el celular dibujado (escritorio) y en el marco de /presentacion. */
export function PhoneStatusBar() {
  const time = useSyncExternalStore(
    subscribe,
    () => formatTime(new Date(Math.floor(Date.now() / 60_000) * 60_000)),
    () => null,
  )
  return (
    <div aria-hidden className="hidden h-8 items-center justify-between px-7 text-[13px] font-semibold sm:flex embed:flex">
      <span className="tabular-nums">{time}</span>
      <span className="flex items-center gap-1.5">
        <Signal className="size-3.5" strokeWidth={2.5} />
        <Wifi className="size-3.5" strokeWidth={2.5} />
        <BatteryFull className="size-4.5" strokeWidth={2} />
      </span>
    </div>
  )
}
