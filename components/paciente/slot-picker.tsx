"use client"

import { useEffect, useState } from "react"
import { CalendarX2 } from "lucide-react"
import { toast } from "sonner"
import { capitalize, formatDate, formatDayParts, formatTime } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type SlotsByDay = Record<string, string[]>

/**
 * Día y horario libres de un médico (RPC de lectura `available_slots`).
 * Consulta todos los días a la vez para mostrar cuántos cupos quedan y saltar los llenos.
 * Cambiar `reloadKey` vuelve a consultar (p. ej. si otro paciente ganó el cupo).
 */
export function SlotPicker({
  doctorId,
  days,
  value,
  onChange,
  reloadKey = 0,
}: {
  doctorId: string
  days: string[]
  value: string | null
  onChange: (slot: string | null) => void
  reloadKey?: number
}) {
  const [slots, setSlots] = useState<SlotsByDay | null>(null)
  const [day, setDay] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all(
      days.map(async (d) => {
        const { data, error } = await supabase.rpc("available_slots", { p_doctor_id: doctorId, p_date: d })
        if (error) throw error
        return [d, data.map((s) => s.slot)] as const
      }),
    )
      .then((entries) => {
        if (!active) return
        const byDay = Object.fromEntries(entries)
        setSlots(byDay)
        setDay((current) =>
          current && byDay[current]?.length ? current : (days.find((d) => byDay[d].length) ?? days[0]),
        )
      })
      .catch((error: { message: string }) => active && toast.error(error.message))
    return () => {
      active = false
    }
  }, [doctorId, days, reloadKey])

  const daySlots = day && slots ? slots[day] : []

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 font-medium">Día</p>
        <div className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1">
          {days.map((d) => {
            const p = formatDayParts(d)
            const count = slots?.[d]?.length
            const selected = d === day
            const full = count === 0
            return (
              <button
                key={d}
                type="button"
                disabled={!slots || full}
                onClick={() => {
                  setDay(d)
                  onChange(null)
                }}
                aria-pressed={selected}
                className={cn(
                  "flex w-[4.5rem] shrink-0 snap-start flex-col items-center rounded-xl border py-2 leading-tight transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/50",
                  full && "opacity-45",
                )}
              >
                <span className="text-xs font-medium uppercase">{p.weekday}</span>
                <span className="text-xl font-semibold tabular-nums">{p.day}</span>
                <span className="text-xs uppercase">{p.month}</span>
                <span
                  className={cn(
                    "mt-1 text-[11px]",
                    selected ? "text-primary-foreground/85" : "text-muted-foreground",
                  )}
                >
                  {count === undefined ? "…" : full ? "Sin cupos" : `${count} libres`}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 font-medium">{day ? `Horarios del ${formatDate(day)}` : "Horario"}</p>
        {!slots ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : daySlots.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center text-muted-foreground">
            <CalendarX2 className="size-6" />
            {day ? capitalize(formatDate(day)) : "Este día"} no tiene horarios libres. Pruebe otro día.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {daySlots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => onChange(slot)}
                aria-pressed={slot === value}
                className={cn(
                  "h-12 rounded-xl border text-base font-medium tabular-nums transition-colors",
                  slot === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/50",
                )}
              >
                {formatTime(slot)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
