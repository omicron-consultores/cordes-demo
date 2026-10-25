"use client"

import { useState, useSyncExternalStore } from "react"
import { CalendarPlus, CalendarX2, FilterX, Phone, Smartphone, Store, type LucideIcon } from "lucide-react"
import { notify } from "@/components/layout/notice"
import { APPOINTMENT_STATUS, StatusPill } from "@/components/paciente/status"
import { Button } from "@/components/ui/button"
import type { Database } from "@/lib/database.types"
import { capitalize, formatDate, formatShortDate, formatTime } from "@/lib/format"
import { supabase, type Tables, type Views } from "@/lib/supabase"
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh"
import { cn } from "@/lib/utils"
import { BookDialog } from "./book-dialog"
import { NoShowButton } from "@/components/agenda/no-show-button"
import { SelectField } from "./select-field"

type Appointment = Views<"v_appointments">
type Status = Database["public"]["Enums"]["appointment_status"]
type Channel = Database["public"]["Enums"]["appointment_channel"]

export type EstablishmentOption = { code: string; label: string }
export type DoctorOption = { id: string; name: string; specialty: string; establishmentCode: string }

const STATUSES: Status[] = ["programada", "en_atencion", "atendida", "no_asistio", "cancelada"]
const STATUS_PLURAL: Record<Status, string> = {
  programada: "Programadas",
  en_atencion: "En consulta",
  atendida: "Atendidas",
  no_asistio: "No asistió",
  cancelada: "Canceladas",
}
const CHANNELS: Record<Channel, { label: string; icon: LucideIcon }> = {
  app: { label: "App", icon: Smartphone },
  ventanilla: { label: "Ventanilla", icon: Store },
  telefono: { label: "Teléfono", icon: Phone },
}
const FRESH_MS = 10_000
const LATE_MS = 15 * 60_000

/** Agenda del día de Admisión: filtros, estado de cada cita, ventanilla y "No asistió", en vivo. */
export function AgendaBoard({
  today,
  appointments,
  establishments,
  doctors,
  bookingDays,
}: {
  today: string
  appointments: Appointment[]
  establishments: EstablishmentOption[]
  doctors: DoctorOption[]
  bookingDays: string[]
}) {
  const [establishment, setEstablishment] = useState("")
  const [doctorId, setDoctorId] = useState("")
  const [status, setStatus] = useState<Status | "">("")
  const [booking, setBooking] = useState(false)
  const { live, fresh } = useLiveAgenda(today, doctors)
  const minute = useMinute()

  const doctorChoices = establishment ? doctors.filter((d) => d.establishmentCode === establishment) : doctors
  const scoped = appointments.filter(
    (a) => (!establishment || a.establishment_code === establishment) && (!doctorId || a.doctor_id === doctorId),
  )
  const counts = Object.fromEntries(STATUSES.map((s) => [s, scoped.filter((a) => a.status === s).length]))
  const rows = status ? scoped.filter((a) => a.status === status) : scoped
  const filtered = Boolean(establishment || doctorId || status)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda del día</h1>
          <p className="flex items-center gap-2 text-muted-foreground">
            {capitalize(formatDate(today))}
            <LiveDot live={live} />
          </p>
        </div>
        <Button size="lg" onClick={() => setBooking(true)}>
          <CalendarPlus />
          Agendar por ventanilla
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <SelectField
          label="Establecimiento"
          className="w-full sm:w-64"
          value={establishment}
          onChange={(e) => {
            const code = e.target.value
            setEstablishment(code)
            if (code && doctors.find((d) => d.id === doctorId)?.establishmentCode !== code) setDoctorId("")
          }}
        >
          <option value="">Todos los establecimientos</option>
          {establishments.map((e) => (
            <option key={e.code} value={e.code}>
              {e.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Médico"
          className="w-full sm:w-72"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
        >
          <option value="">Todos los médicos</option>
          {doctorChoices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} · {d.specialty}
            </option>
          ))}
        </SelectField>
        {filtered && (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              setEstablishment("")
              setDoctorId("")
              setStatus("")
            }}
          >
            <FilterX />
            Quitar filtros
          </Button>
        )}
      </div>

      <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        <StatusChip label="Todas" count={scoped.length} active={!status} onClick={() => setStatus("")} />
        {STATUSES.map((s) => (
          <StatusChip
            key={s}
            label={STATUS_PLURAL[s]}
            count={counts[s]}
            active={status === s}
            onClick={() => setStatus(status === s ? "" : s)}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
            <CalendarX2 className="size-7" />
            {filtered ? "No hay citas con estos filtros." : "No hay citas para hoy."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Médico</th>
                  <th className="hidden px-4 py-3 xl:table-cell">Establecimiento</th>
                  <th className="hidden px-4 py-3 md:table-cell">Canal</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((a) => (
                  <AgendaRow
                    key={a.id}
                    appt={a}
                    fresh={fresh.has(a.id!)}
                    late={minute !== null && minute * 60_000 > Date.parse(a.scheduled_at!) + LATE_MS}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BookDialog
        open={booking}
        onOpenChange={setBooking}
        doctors={doctors}
        establishments={establishments}
        days={bookingDays}
        defaultDoctorId={doctorId}
      />
    </div>
  )
}

function AgendaRow({ appt, fresh, late }: { appt: Appointment; fresh: boolean; late: boolean }) {
  const channel = CHANNELS[appt.channel!]
  const programmed = appt.status === "programada"
  return (
    <tr
      className={cn(
        "transition-colors duration-1000",
        fresh ? "bg-highlight/10" : "hover:bg-muted/40",
        !programmed && appt.status !== "en_atencion" && "text-muted-foreground",
      )}
    >
      <td className="px-4 py-3 align-top">
        <span className="text-base font-semibold text-foreground tabular-nums">{formatTime(appt.scheduled_at!)}</span>
        {fresh && (
          <span className="mt-1 block w-fit rounded-full bg-highlight px-2 py-0.5 text-[11px] font-semibold text-white">
            Nueva
          </span>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <p className="font-medium text-foreground">{appt.patient_name}</p>
        <p className="text-xs text-muted-foreground tabular-nums">{appt.matricula}</p>
      </td>
      <td className="px-4 py-3 align-top">
        <p className="text-foreground">{appt.doctor_name}</p>
        <p className="text-xs text-muted-foreground">
          {appt.specialty_name}
          <span className="xl:hidden"> · {appt.establishment_zone}</span>
        </p>
      </td>
      <td className="hidden px-4 py-3 align-top xl:table-cell">
        {appt.establishment_name}
        <p className="text-xs text-muted-foreground">{appt.establishment_zone}</p>
      </td>
      <td className="hidden px-4 py-3 align-top md:table-cell">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <channel.icon className="size-4" />
          {channel.label}
        </span>
      </td>
      <td className="px-4 py-3 align-top">
        <StatusPill {...APPOINTMENT_STATUS[appt.status!]} />
        {programmed && late && <p className="mt-1 text-xs font-medium text-[#86601f]">Pasó su hora</p>}
      </td>
      <td className="px-4 py-3 text-right align-top">
        {programmed && (
          <NoShowButton
            appointmentId={appt.id!}
            summary={`${appt.patient_name} · ${formatTime(appt.scheduled_at!)} con ${appt.doctor_name}`}
            emphasized={late}
          />
        )}
      </td>
    </tr>
  )
}

function StatusChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50",
      )}
    >
      {label}
      <span
        className={cn(
          "min-w-6 rounded-full px-1.5 text-xs tabular-nums",
          active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  )
}

function LiveDot({ live }: { live: boolean }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs", live ? "text-ok" : "text-muted-foreground")}
      title={live ? "Se actualiza sola cuando se agenda o cambia una cita" : "Conectando…"}
    >
      <span className={cn("size-2 rounded-full", live ? "animate-pulse bg-ok" : "bg-muted-foreground/50")} />
      {live ? "En vivo" : "Conectando…"}
    </span>
  )
}

/**
 * Realtime sobre `appointments`: cualquier cambio refresca la agenda (componentes de servidor).
 * Las citas nuevas de hoy se resaltan unos segundos; las que llegan desde la app avisan con un toast.
 */
function useLiveAgenda(today: string, doctors: DoctorOption[]) {
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set())

  const live = useRealtimeRefresh(["appointments"], {
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
      if (row.channel === "app") notifyFromApp(row, doctors)
    },
  })

  return { live, fresh }
}

async function notifyFromApp(row: Tables<"appointments">, doctors: DoctorOption[]) {
  const { data: p } = await supabase
    .from("patients")
    .select("first_names, last_names")
    .eq("id", row.patient_id)
    .maybeSingle()
  const doctor = doctors.find((d) => d.id === row.doctor_id)
  notify.info(`Nueva cita desde la app${p ? `: ${p.first_names} ${p.last_names}` : ""}`, {
    description: [formatTime(row.scheduled_at), doctor?.name].filter(Boolean).join(" · "),
  })
}

// Minuto actual en el cliente (null en el servidor): marca las citas cuya hora ya pasó.
const subscribeMinute = (cb: () => void) => {
  const id = setInterval(cb, 30_000)
  return () => clearInterval(id)
}
function useMinute(): number | null {
  return useSyncExternalStore(
    subscribeMinute,
    () => Math.floor(Date.now() / 60_000),
    () => null,
  )
}
