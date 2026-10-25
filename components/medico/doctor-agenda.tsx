"use client"

import { useState, useTransition } from "react"
import { CalendarX2, Loader2, ShieldAlert, Stethoscope } from "lucide-react"
import { startEncounter } from "@/app/(roles)/medico/actions"
import { NoShowButton } from "@/components/agenda/no-show-button"
import { TodayLine } from "@/components/layout/today-line"
import { notify } from "@/components/layout/notice"
import { APPOINTMENT_STATUS, StatusPill } from "@/components/paciente/status"
import { Button } from "@/components/ui/button"
import { formatShortDate, formatTime } from "@/lib/format"
import type { Tables, Views } from "@/lib/supabase"
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh"
import { cn } from "@/lib/utils"

type Appointment = Views<"v_appointments">

const FRESH_MS = 10_000

/** Agenda del día del médico activo: atender, continuar la consulta o marcar "No asistió", en vivo. */
export function DoctorAgenda({
  doctorId,
  today,
  appointments,
  allergies,
  header,
}: {
  doctorId: string
  today: string
  appointments: Appointment[]
  allergies: Record<string, string[]>
  header: React.ReactNode
}) {
  const { live, fresh } = useLiveDoctorAgenda(doctorId, today)
  const [opening, startOpening] = useTransition()
  const [openingId, setOpeningId] = useState<string | null>(null)

  const count = (s: Appointment["status"]) => appointments.filter((a) => a.status === s).length
  const nextId = appointments.find((a) => a.status === "programada" || a.status === "en_atencion")?.id

  function open(appt: Appointment) {
    setOpeningId(appt.id)
    startOpening(async () => {
      const result = await startEncounter(appt.id!)
      // Si no falla, la acción redirige a la atención.
      if (result?.error) notify.error("No se pudo abrir la atención", { description: result.error })
    })
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TodayLine
          today={today}
          live={live}
          prefix="Agenda de hoy · "
          liveTitle="Se actualiza sola cuando se agenda o cambia una cita"
          className="text-lg font-medium text-foreground"
        />
        <dl className="flex gap-6 text-sm text-muted-foreground">
          <Stat label="Por atender" value={count("programada") + count("en_atencion")} />
          <Stat label="Atendidas" value={count("atendida")} />
          <Stat label="No asistió" value={count("no_asistio")} />
        </dl>
      </div>

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
            <CalendarX2 className="size-7" />
            No tiene citas para hoy.
          </div>
        ) : (
          <ul className="divide-y">
            {appointments.map((a) => (
              <AgendaItem
                key={a.id}
                appt={a}
                allergies={allergies[a.patient_id!] ?? []}
                next={a.id === nextId}
                fresh={fresh.has(a.id!)}
                opening={opening && openingId === a.id}
                disabled={opening}
                onOpen={() => open(a)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function AgendaItem({
  appt,
  allergies,
  next,
  fresh,
  opening,
  disabled,
  onOpen,
}: {
  appt: Appointment
  allergies: string[]
  next: boolean
  fresh: boolean
  opening: boolean
  disabled: boolean
  onOpen: () => void
}) {
  const programmed = appt.status === "programada"
  const inProgress = appt.status === "en_atencion"
  const active = programmed || inProgress

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 transition-colors duration-1000",
        fresh ? "bg-highlight/10" : next && "bg-secondary/50",
        !active && "text-muted-foreground",
      )}
    >
      <div className="w-16 shrink-0">
        <p className={cn("text-xl font-semibold tabular-nums", active && "text-foreground")}>
          {formatTime(appt.scheduled_at!)}
        </p>
        {fresh ? (
          <span className="mt-1 block w-fit rounded-full bg-highlight px-2 py-0.5 text-[11px] font-semibold text-white">
            Nueva
          </span>
        ) : (
          next && <span className="mt-1 block text-xs font-medium text-primary">Siguiente</span>
        )}
      </div>

      <div className="min-w-0 flex-1 basis-56">
        <p className={cn("font-medium", active && "text-foreground")}>{appt.patient_name}</p>
        <p className="text-sm text-muted-foreground">
          <span className="tabular-nums">{appt.matricula}</span>
          {appt.reason && <> · {appt.reason}</>}
        </p>
        {allergies.length > 0 && active && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-critical">
            <ShieldAlert className="size-3.5" />
            Alergia: {allergies.join(", ")}
          </p>
        )}
      </div>

      <StatusPill {...APPOINTMENT_STATUS[appt.status!]} />

      <div className="flex w-full justify-end gap-2 sm:w-56">
        {programmed && (
          <NoShowButton
            appointmentId={appt.id!}
            summary={`${appt.patient_name} · ${formatTime(appt.scheduled_at!)}`}
            emphasized={false}
          />
        )}
        {active && (
          <Button size="lg" variant={inProgress ? "outline" : "default"} disabled={disabled} onClick={onOpen}>
            {opening ? <Loader2 className="animate-spin" /> : <Stethoscope />}
            {inProgress ? "Continuar" : "Atender"}
          </Button>
        )}
      </div>
    </li>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <dd className="text-2xl font-semibold text-foreground tabular-nums">{value}</dd>
      <dt>{label}</dt>
    </div>
  )
}

/**
 * Realtime sobre las citas del médico: cualquier cambio refresca la agenda (componentes de servidor).
 * Las citas nuevas de hoy (p. ej. agendadas desde la app) se resaltan unos segundos y avisan con un toast.
 */
function useLiveDoctorAgenda(doctorId: string, today: string) {
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set())

  const live = useRealtimeRefresh(["appointments"], {
    filter: `doctor_id=eq.${doctorId}`,
    onChange: (change) => {
      if (change.eventType !== "INSERT") return
      const row = change.new as Tables<"appointments">
      if (formatShortDate(row.scheduled_at) !== formatShortDate(today)) return

      setFresh((s) => new Set(s).add(row.id))
      setTimeout(
        () =>
          setFresh((s) => {
            const next = new Set(s)
            next.delete(row.id)
            return next
          }),
        FRESH_MS,
      )
      notify.info("Nueva cita para hoy", { description: `A las ${formatTime(row.scheduled_at)}` })
    },
  })

  return { live, fresh }
}
