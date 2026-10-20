"use client"

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export type VitalsPoint = { date: string; systolic: number | null; diastolic: number | null; weight: number | null }

// Variantes de la paleta CORDES validadas para gráficos (separación para daltonismo y contraste sobre blanco).
const SYSTOLIC = "#008c7c"
const DIASTOLIC = "#d9600a"
const INK_MUTED = "#6b7a80"
const GRID = "#e6ebe9"

/** Presión arterial y peso de las últimas atenciones: dos gráficos pequeños (nunca doble eje). */
export function VitalsTrend({ points }: { points: VitalsPoint[] }) {
  const bp = points.filter((p) => p.systolic !== null && p.diastolic !== null)
  const weight = points.filter((p) => p.weight !== null)
  const lastBp = bp.at(-1)
  const lastWeight = weight.at(-1)

  return (
    <div className="space-y-5">
      <div>
        <ChartHeader
          title="Presión arterial"
          unit="mmHg"
          last={lastBp && `${lastBp.systolic}/${lastBp.diastolic}`}
          legend={[
            { label: "Sistólica", color: SYSTOLIC },
            { label: "Diastólica", color: DIASTOLIC },
          ]}
        />
        {bp.length < 2 ? (
          <NotEnough />
        ) : (
          <MiniChart
            data={bp}
            domain={[(min: number) => Math.min(min - 10, 60), (max: number) => Math.max(max + 10, 170)]}
            ticks={[90, 140]}
            references={[140, 90]}
            series={[
              { key: "systolic", name: "Sistólica", color: SYSTOLIC },
              { key: "diastolic", name: "Diastólica", color: DIASTOLIC },
            ]}
            unit="mmHg"
          />
        )}
      </div>

      <div>
        <ChartHeader title="Peso" unit="kg" last={lastWeight && String(lastWeight.weight).replace(".", ",")} />
        {weight.length < 2 ? (
          <NotEnough />
        ) : (
          <MiniChart
            data={weight}
            domain={[(min: number) => Math.floor((min - 2) / 5) * 5, (max: number) => Math.ceil((max + 2) / 5) * 5]}
            series={[{ key: "weight", name: "Peso", color: SYSTOLIC }]}
            unit="kg"
          />
        )}
      </div>
    </div>
  )
}

function ChartHeader({
  title,
  unit,
  last,
  legend,
}: {
  title: string
  unit: string
  last?: string
  legend?: { label: string; color: string }[]
}) {
  return (
    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
      <p className="text-sm font-medium">
        {title} <span className="font-normal text-muted-foreground">({unit})</span>
      </p>
      <div className="flex items-baseline gap-3 text-xs text-muted-foreground">
        {legend?.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded-full" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
        {last && (
          <span>
            Última: <strong className="text-sm font-semibold text-foreground tabular-nums">{last}</strong>
          </span>
        )}
      </div>
    </div>
  )
}

type AxisBound = (value: number) => number

function MiniChart({
  data,
  domain,
  ticks,
  references = [],
  series,
  unit,
}: {
  data: VitalsPoint[]
  domain: [AxisBound, AxisBound]
  ticks?: number[]
  references?: number[]
  series: { key: keyof VitalsPoint; name: string; color: string }[]
  unit: string
}) {
  return (
    <div className="h-32" role="img" aria-label={`Evolución en ${data.length} atenciones`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: INK_MUTED }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={domain}
            ticks={ticks}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: INK_MUTED }}
            tickCount={4}
            allowDecimals={false}
          />
          {references.map((y) => (
            <ReferenceLine key={y} y={y} stroke={INK_MUTED} strokeDasharray="3 3" strokeOpacity={0.5} />
          ))}
          <Tooltip
            cursor={{ stroke: INK_MUTED, strokeOpacity: 0.4 }}
            formatter={(value, name) => [`${String(value).replace(".", ",")} ${unit}`, name]}
            labelFormatter={(label) => `Atención del ${label}`}
            contentStyle={{ borderRadius: 8, fontSize: 12, borderColor: GRID }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3, fill: s.color, stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function NotEnough() {
  return (
    <p className="rounded-lg bg-muted/60 px-3 py-4 text-center text-xs text-muted-foreground">
      Se necesitan al menos 2 atenciones con este dato para ver la evolución.
    </p>
  )
}
