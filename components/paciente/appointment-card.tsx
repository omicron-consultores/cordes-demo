import { MapPin, Stethoscope } from "lucide-react"
import { capitalize, formatDate, formatDayParts, formatTime, placeLabel } from "@/lib/format"
import type { Views } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { APPOINTMENT_STATUS, StatusPill } from "./status"

export type AppointmentRow = Views<"v_appointments">

/** Tarjeta de cita: bloque de fecha grande + especialidad, médico y lugar. */
export function AppointmentCard({
  appt,
  actions,
  muted = false,
}: {
  appt: AppointmentRow
  actions?: React.ReactNode
  muted?: boolean
}) {
  const at = appt.scheduled_at!
  const day = formatDayParts(at)
  const status = APPOINTMENT_STATUS[appt.status!]

  return (
    <article className="rounded-2xl bg-card p-4 shadow-xs ring-1 ring-foreground/5">
      <div className="flex gap-4">
        <div
          className={cn(
            "flex w-16 shrink-0 flex-col items-center justify-center rounded-xl py-2 leading-none",
            muted ? "bg-muted text-muted-foreground" : "bg-secondary text-primary",
          )}
          aria-hidden
        >
          <span className="text-xs font-medium uppercase">{day.weekday}</span>
          <span className="my-1 text-2xl font-semibold tabular-nums">{day.day}</span>
          <span className="text-xs font-medium uppercase">{day.month}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">
              {capitalize(formatDate(at))}
              <span className="block text-2xl tabular-nums">{formatTime(at)}</span>
            </p>
            {appt.status !== "programada" && <StatusPill {...status} />}
          </div>
        </div>
      </div>

      <dl className="mt-3 space-y-1.5 text-muted-foreground">
        <div className="flex items-start gap-2">
          <dt className="sr-only">Médico</dt>
          <Stethoscope className="mt-0.5 size-4 shrink-0 text-primary" />
          <dd>
            <span className="font-medium text-foreground">{appt.specialty_name}</span> · {appt.doctor_name}
          </dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="sr-only">Lugar</dt>
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
          <dd>{placeLabel(appt.establishment_name!, appt.establishment_zone!)}</dd>
        </div>
      </dl>

      {actions && <div className="mt-4 grid grid-cols-2 gap-2">{actions}</div>}
    </article>
  )
}
