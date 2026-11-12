import { ChevronDown, FlaskConical, Hourglass, ImageOff, ScanLine } from "lucide-react"
import { ImageViewer } from "@/components/medico/image-viewer"
import { shortDoctorName, splitReport, type DiagnosticOrder, type LabFlag } from "@/lib/exams"
import { capitalize, formatDate, formatNumber, formatShortDate } from "@/lib/format"
import type { Views } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { StatusPill } from "./status"

type LabRow = Views<"v_lab_results">
type Point = { at: string; value: number; flag: LabFlag }

const EVOLUTION_MIN_POINTS = 3

// Lenguaje del paciente: sin rojo alarmante ni interpretaciones clínicas.
const VALUE_LABEL = {
  normal: { label: "Dentro de lo normal", tone: "ok" },
  fuera: { label: "Fuera del rango normal", tone: "warning" },
} as const

/** Pestaña "Exámenes" del historial: en proceso y resultados (del más reciente al más antiguo). */
export function PatientExams({
  orders,
  results,
  openId,
}: {
  orders: DiagnosticOrder[]
  results: LabRow[]
  /** Estudio que llega abierto (desde "Ver resultado" en el inicio). */
  openId?: string
}) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
        <FlaskConical className="size-7" />
        Todavía no tiene exámenes.
      </div>
    )
  }

  const pending = orders.filter((o) => o.status === "solicitado")
  const done = orders
    .filter((o) => o.status === "resultado")
    .sort((a, b) => b.resulted_at!.localeCompare(a.resulted_at!))

  const byOrder = Map.groupBy(results, (r) => r.order_id!)
  // Serie completa de cada valor (para "Su evolución"), del más antiguo al más reciente.
  const series = new Map<string, Point[]>()
  for (const r of [...results].sort((a, b) => a.resulted_at!.localeCompare(b.resulted_at!))) {
    const key = r.analyte_code!
    series.set(key, [...(series.get(key) ?? []), { at: r.resulted_at!, value: r.value!, flag: r.flag as LabFlag }])
  }
  // El gráfico va solo en el resultado más reciente de cada estudio.
  const latestOfStudy = new Set(
    [...Map.groupBy(done, (o) => o.study_code!).values()].map((list) => list[0].id!),
  )

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section aria-labelledby="en-proceso" className="space-y-3">
          <h2 id="en-proceso" className="text-lg font-semibold">
            En proceso
          </h2>
          <ul className="space-y-3">
            {pending.map((o) => (
              <li key={o.id} className="flex gap-3 rounded-2xl bg-card p-4 shadow-xs ring-1 ring-foreground/5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/12 text-[#86601f]">
                  <Hourglass className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">{o.study_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Solicitado
                    {o.doctor_name && ` por el ${shortDoctorName(o.doctor_name)}`} el{" "}
                    <span className="tabular-nums">{formatShortDate(o.requested_at!).slice(0, 5)}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">Le avisaremos aquí cuando esté su resultado.</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {done.length > 0 && (
        <section aria-labelledby="resultados" className="space-y-3">
          <h2 id="resultados" className="text-lg font-semibold">
            Resultados
          </h2>
          <ol className="space-y-3">
            {done.map((o) => (
              <li key={o.id} id={`examen-${o.id}`} className="scroll-mt-20">
                <ResultCard
                  order={o}
                  rows={byOrder.get(o.id!) ?? []}
                  series={latestOfStudy.has(o.id!) ? series : null}
                  open={o.id === openId}
                />
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

function ResultCard({
  order: o,
  rows,
  series,
  open,
}: {
  order: DiagnosticOrder
  rows: LabRow[]
  series: Map<string, Point[]> | null
  open: boolean
}) {
  const lab = o.kind === "laboratorio"
  const outOfRange = rows.some((r) => r.flag !== "normal")
  const Icon = lab ? FlaskConical : ScanLine

  return (
    <details open={open || undefined} className="group rounded-2xl bg-card shadow-xs ring-1 ring-foreground/5">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{o.study_name}</span>
          <span className="block text-sm text-muted-foreground">{capitalize(formatDate(o.resulted_at!))}</span>
          {lab && rows.length > 0 && (
            <StatusPill {...VALUE_LABEL[outOfRange ? "fuera" : "normal"]} className="mt-1.5 h-6 px-2.5 text-xs" />
          )}
        </span>
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t px-4 pt-3 pb-4">{lab ? <LabBody rows={rows} series={series} /> : <ImageBody order={o} />}</div>
    </details>
  )
}

function LabBody({ rows, series }: { rows: LabRow[]; series: Map<string, Point[]> | null }) {
  const outOfRange = rows.some((r) => r.flag !== "normal")
  const evolution = series ? rows.filter((r) => (series.get(r.analyte_code!)?.length ?? 0) >= EVOLUTION_MIN_POINTS) : []

  return (
    <div className="space-y-4">
      <ul className="divide-y">
        {rows.map((r) => (
          <li key={r.id} className="py-3 first:pt-0">
            <p className="font-medium">{r.analyte_name}</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums">
              {formatNumber(r.value!)} <span className="text-base font-normal text-muted-foreground">{r.unit}</span>
            </p>
            <p className="text-sm text-muted-foreground">Rango normal: {plainRange(r.ref_low, r.ref_high, r.unit!)}</p>
            <StatusPill
              {...VALUE_LABEL[r.flag === "normal" ? "normal" : "fuera"]}
              className="mt-2 h-7 px-3 text-sm"
            />
          </li>
        ))}
      </ul>

      {outOfRange && (
        <p className="rounded-xl bg-warning/12 px-3 py-2.5 text-sm text-[#6b4c18]">
          Consúltelo con su médico en su próximo control.
        </p>
      )}

      {evolution.map((r) => (
        <section key={r.analyte_code} className="rounded-xl bg-muted/50 p-3">
          <h3 className="font-semibold">Su evolución · {r.analyte_name}</h3>
          <EvolutionChart points={series!.get(r.analyte_code!)!} low={r.ref_low} high={r.ref_high} unit={r.unit!} />
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-3 w-5 rounded-sm bg-ok/25" aria-hidden />
            La franja verde es el rango normal.
          </p>
        </section>
      ))}
    </div>
  )
}

function ImageBody({ order: o }: { order: DiagnosticOrder }) {
  const { body, conclusion } = splitReport(o.report ?? "")
  const summary = conclusion?.replace(/^Conclusión:\s*/, "") ?? body

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {o.image_path ? (
          <div className="w-28 shrink-0 space-y-1">
            <ImageViewer src={o.image_path} title={`${o.study_name} · ${formatShortDate(o.resulted_at!)}`} />
            {o.image_credit && <p className="text-[10px] leading-tight text-muted-foreground">{o.image_credit}</p>}
          </div>
        ) : (
          <div className="flex aspect-4/3 w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-lg bg-muted px-2 text-center text-[11px] leading-tight text-muted-foreground">
            <ImageOff className="size-5" />
            Imagen no disponible en la demo
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Conclusión del informe</p>
          <p className="mt-0.5 leading-relaxed font-medium">{capitalize(summary)}</p>
        </div>
      </div>

      {conclusion && (
        <details className="group/report rounded-xl border">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 font-medium text-primary [&::-webkit-details-marker]:hidden">
            Ver informe completo
            <ChevronDown className="size-5 transition-transform group-open/report:rotate-180" />
          </summary>
          <div className="space-y-2 border-t px-3 py-3 text-sm leading-relaxed">
            {body && <p>{body}</p>}
            <p className="font-semibold">{conclusion}</p>
            {o.reported_by && <p className="text-muted-foreground">Informó: {o.reported_by}</p>}
          </div>
        </details>
      )}
    </div>
  )
}

/** "entre 70 y 100 mg/dL" · "hasta 200 mg/dL" · "desde 40 mg/dL" */
function plainRange(low: number | null, high: number | null, unit: string): string {
  const u = unit ? ` ${unit}` : ""
  if (low !== null && high !== null) return `entre ${formatNumber(low)} y ${formatNumber(high)}${u}`
  if (high !== null) return `hasta ${formatNumber(high)}${u}`
  if (low !== null) return `desde ${formatNumber(low)}${u}`
  return "—"
}

// ---------- Gráfico "Su evolución" ----------

const W = 320
const H = 150
const PAD_X = 22
const PAD_TOP = 24
const PAD_BOTTOM = 26

/** Valores a lo largo del tiempo, con la banda del rango normal sombreada. */
function EvolutionChart({ points, low, high, unit }: { points: Point[]; low: number | null; high: number | null; unit: string }) {
  const values = points.map((p) => p.value)
  let min = Math.min(...values, ...(low !== null ? [low] : []))
  let max = Math.max(...values, ...(high !== null ? [high] : []))
  const span = max - min || Math.abs(max) || 1
  min -= span * 0.12
  max += span * 0.12

  const y = (v: number) => PAD_TOP + (1 - (v - min) / (max - min)) * (H - PAD_TOP - PAD_BOTTOM)
  const x = (i: number) => PAD_X + (i * (W - 2 * PAD_X)) / Math.max(points.length - 1, 1)
  const bandTop = high !== null ? y(high) : PAD_TOP
  const bandBottom = low !== null ? y(low) : H - PAD_BOTTOM

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-2 h-auto w-full"
      role="img"
      aria-label={`Evolución: ${points.map((p) => `${formatShortDate(p.at)} ${formatNumber(p.value)} ${unit}`).join(", ")}`}
    >
      <rect
        x={0}
        y={bandTop}
        width={W}
        height={Math.max(bandBottom - bandTop, 0)}
        rx={4}
        className="fill-ok/25"
      />
      <polyline
        points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")}
        fill="none"
        strokeWidth={2.5}
        strokeLinejoin="round"
        className="stroke-primary"
      />
      {points.map((p, i) => (
        <g key={p.at}>
          <circle
            cx={x(i)}
            cy={y(p.value)}
            r={5}
            strokeWidth={2}
            className={cn("stroke-card", p.flag === "normal" ? "fill-primary" : "fill-warning")}
          />
          <text
            x={x(i)}
            y={y(p.value) - 10}
            textAnchor="middle"
            className="fill-foreground text-[12px] font-semibold tabular-nums"
          >
            {formatNumber(p.value)}
          </text>
          <text x={x(i)} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[11px] tabular-nums">
            {formatShortDate(p.at).slice(0, 5)}
          </text>
        </g>
      ))}
    </svg>
  )
}
