"use client"

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { capitalize, formatDate, formatDayParts, formatNumber } from "@/lib/format"

export type ActivityDay = { day: string; attended: number; prescriptions: number }

// Variantes de la paleta CORDES validadas para gráficos (separación para daltonismo y contraste sobre blanco).
const ATTENDED = "#008c7c"
const PRESCRIPTIONS = "#d9600a"
const INK_MUTED = "#6b7a80"
const GRID = "#e6ebe9"

const SERIES = [
  { key: "attended", name: "Citas atendidas", color: ATTENDED },
  { key: "prescriptions", name: "Recetas emitidas", color: PRESCRIPTIONS },
] as const

/** 'YYYY-MM-DD' cae en sábado o domingo (no hay consulta: se omite del eje). */
function isWeekend(day: string): boolean {
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay()
  return dow === 0 || dow === 6
}

/**
 * Citas atendidas frente a recetas emitidas por día hábil, últimos 30 días.
 * Hoy queda fuera: el día en curso hundiría la línea (ya está en los KPIs de arriba).
 */
export function ActivityChart({ days, today }: { days: ActivityDay[]; today: string }) {
  const shown = days.filter((d) => d.day !== today && !isWeekend(d.day))
  const data = shown.map((d) => {
    const p = formatDayParts(d.day)
    return { ...d, label: `${p.day} ${p.month}` }
  })
  const totals = {
    attended: shown.reduce((s, d) => s + d.attended, 0),
    prescriptions: shown.reduce((s, d) => s + d.prescriptions, 0),
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap gap-x-8 gap-y-2" aria-label="Totales de los últimos 30 días">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-2.5">
            <span className="h-1 w-5 rounded-full" style={{ background: s.color }} aria-hidden />
            <span className="text-muted-foreground">{s.name}</span>
            <span className="text-2xl font-semibold tabular-nums">{formatNumber(totals[s.key])}</span>
          </div>
        ))}
      </div>

      <div
        className="min-h-72 flex-1"
        role="img"
        aria-label={`Actividad de ${data.length} días hábiles: ${formatNumber(totals.attended)} citas atendidas y ${formatNumber(totals.prescriptions)} recetas emitidas`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: GRID }}
              tick={{ fontSize: 13, fill: INK_MUTED }}
              minTickGap={16}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 13, fill: INK_MUTED }}
              allowDecimals={false}
              width={48}
            />
            <Tooltip
              cursor={{ stroke: INK_MUTED, strokeOpacity: 0.4 }}
              formatter={(value, name) => [formatNumber(Number(value)), name]}
              labelFormatter={(_, payload) => {
                const day = payload?.[0]?.payload?.day as string | undefined
                return day ? capitalize(formatDate(day)) : ""
              }}
              contentStyle={{ borderRadius: 8, fontSize: 14, borderColor: GRID }}
            />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-muted-foreground">Días hábiles (lunes a viernes) hasta ayer. Lo de hoy está en los indicadores de arriba.</p>
    </div>
  )
}
