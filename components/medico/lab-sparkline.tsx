import type { LabPoint } from "@/lib/exams"
import { cn } from "@/lib/utils"

const W = 104
const H = 34
const PAD = 5

export const FLAG_FILL: Record<LabPoint["flag"], string> = {
  alto: "fill-critical",
  bajo: "fill-warning",
  normal: "fill-muted-foreground",
}

/** Tendencia de un analito: todos los valores, con la banda del rango normal sombreada. */
export function LabSparkline({
  points,
  low,
  high,
  className,
}: {
  points: LabPoint[]
  low: number | null
  high: number | null
  className?: string
}) {
  const values = points.map((p) => p.value)
  let min = Math.min(...values, ...(low !== null ? [low] : []))
  let max = Math.max(...values, ...(high !== null ? [high] : []))
  const span = max - min || Math.abs(max) || 1
  min -= span * 0.15
  max += span * 0.15

  const y = (v: number) => PAD + (1 - (v - min) / (max - min)) * (H - 2 * PAD)
  const x = (i: number) => (points.length === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (points.length - 1))

  const bandTop = high !== null ? y(high) : 0
  const bandBottom = low !== null ? y(low) : H
  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className={cn("shrink-0 overflow-visible", className)}
      aria-hidden
    >
      {(low !== null || high !== null) && (
        <rect x={0} y={bandTop} width={W} height={Math.max(bandBottom - bandTop, 0)} className="fill-ok/12" rx={2} />
      )}
      {points.length > 1 && (
        <polyline points={line} fill="none" strokeWidth={1.5} strokeLinejoin="round" className="stroke-muted-foreground/50" />
      )}
      {points.map((p, i) => {
        const last = i === points.length - 1
        return (
          <circle
            key={p.orderId}
            cx={x(i)}
            cy={y(p.value)}
            r={last ? 3.5 : 2.25}
            className={cn(FLAG_FILL[p.flag], !last && "opacity-60")}
          />
        )
      })}
    </svg>
  )
}
