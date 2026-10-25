import { boClockToday, capitalize, formatDate, formatWeekdayDay, nextWorkingDays } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Fecha de hoy con el indicador "En vivo" al lado: el mismo encabezado en todas las vistas.
 * `prefix` va antes de la fecha (p. ej. "Agenda de hoy · "). En fin de semana suma una nota discreta
 * con la próxima agenda (consulta externa lun–vie, como nextWorkingDays). Si `today` no es la fecha
 * real (DEMO_DAY_OFFSET), lo avisa: no debe quedar activo en una presentación.
 */
export function TodayLine({
  today,
  live,
  prefix,
  liveTitle,
  className,
}: {
  today: string
  live: boolean
  prefix?: string
  liveTitle?: string
  className?: string
}) {
  const next = nextWorkingDays(today, 1)[0]
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground", className)}>
      <span>
        {prefix}
        {capitalize(formatDate(today))}
      </span>
      {today !== boClockToday() && (
        <span
          className="rounded-full bg-highlight/12 px-2 py-0.5 text-xs font-semibold text-[#b4520c]"
          title="DEMO_DAY_OFFSET activo: la fecha de la app no es la real"
        >
          Fecha simulada
        </span>
      )}
      <LiveDot live={live} title={liveTitle} />
      {next !== today && (
        <span className="text-sm font-normal text-muted-foreground">
          Sin consulta externa hoy · próxima agenda: {formatWeekdayDay(next)}
        </span>
      )}
    </div>
  )
}

export function LiveDot({ live, title }: { live: boolean; title?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        live ? "text-ok" : "text-muted-foreground",
      )}
      title={live ? (title ?? "Se actualiza sola con los cambios de otros equipos") : "Conectando…"}
    >
      <span className={cn("size-2 rounded-full", live ? "animate-pulse bg-ok" : "bg-muted-foreground/50")} />
      {live ? "En vivo" : "Conectando…"}
    </span>
  )
}
