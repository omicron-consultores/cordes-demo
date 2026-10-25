import { capitalize, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Fecha de hoy con el indicador "En vivo" al lado: el mismo encabezado en todas las vistas.
 * `prefix` va antes de la fecha (p. ej. "Agenda de hoy · ").
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
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground", className)}>
      <span>
        {prefix}
        {capitalize(formatDate(today))}
      </span>
      <LiveDot live={live} title={liveTitle} />
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
