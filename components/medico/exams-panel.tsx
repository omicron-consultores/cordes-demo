"use client"

import { useEffect, useState, useTransition } from "react"
import { ChevronDown, Clock, FlaskConical, ImageOff, ScanLine } from "lucide-react"
import { registerSimulatedResult } from "@/app/(roles)/medico/actions"
import { notify } from "@/components/layout/notice"
import { StatusPill } from "@/components/paciente/status"
import { Button } from "@/components/ui/button"
import {
  formatRange,
  orderStatus,
  splitReport,
  type Analyte,
  type DiagnosticOrder,
  type LabFlag,
  type LabStudy,
} from "@/lib/exams"
import { formatDateTime, formatNumber, formatShortDate } from "@/lib/format"
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh"
import { cn } from "@/lib/utils"
import { useExamLink } from "./context-tabs"
import { ImageViewer } from "./image-viewer"
import { LabSparkline } from "./lab-sparkline"

// Marca de cada valor: siempre texto + símbolo junto al color.
const FLAG: Record<LabFlag, { label: string; symbol: string; text: string }> = {
  alto: { label: "Alto", symbol: "▲", text: "text-critical" },
  bajo: { label: "Bajo", symbol: "▼", text: "text-[#86601f]" },
  normal: { label: "Normal", symbol: "", text: "text-foreground" },
}

/** Pestaña "Exámenes": pendientes, laboratorio por estudio, imagenología e historial de solicitudes. */
export function ExamsPanel({
  patientId,
  orders,
  lab,
}: {
  patientId: string
  orders: DiagnosticOrder[]
  lab: LabStudy[]
}) {
  // Resultados registrados desde otro dispositivo (o por el botón de demo) entran solos.
  useRealtimeRefresh(["diagnostic_orders"], { filter: `patient_id=eq.${patientId}` })
  useHighlight()

  const pending = orders.filter((o) => o.status === "solicitado")
  const imaging = orders.filter((o) => o.status === "resultado" && o.kind === "imagen")

  if (orders.length === 0) {
    return <p className="rounded-xl bg-muted/60 px-4 py-3 text-muted-foreground">Sin estudios registrados.</p>
  }

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <Block title="Pendientes" count={pending.length} icon={Clock}>
          <ul className="space-y-2">
            {pending.map((o) => (
              <PendingOrder key={o.id} order={o} />
            ))}
          </ul>
        </Block>
      )}

      {lab.length > 0 && (
        <Block title="Laboratorio" icon={FlaskConical}>
          <div className="space-y-3">
            {lab.map((s) => (
              <LabStudyCard key={s.code} study={s} />
            ))}
          </div>
        </Block>
      )}

      {imaging.length > 0 && (
        <Block title="Imagenología" icon={ScanLine}>
          <div className="space-y-3">
            {imaging.map((o) => (
              <ImagingCard key={o.id} order={o} />
            ))}
          </div>
        </Block>
      )}

      <OrderHistory orders={orders} />
    </div>
  )
}

/** Al llegar desde un chip de Consultas: desplaza hasta el estudio y lo resalta un momento. */
function useHighlight() {
  const { highlight } = useExamLink()
  useEffect(() => {
    if (!highlight) return
    const el = document.getElementById(highlight.target)
    if (!el) return
    // En escritorio solo se desplaza la columna (scroll propio); en tablet, la página.
    const panel = el.closest<HTMLElement>("[data-slot=tabs-content]")
    if (panel && panel.scrollHeight > panel.clientHeight) {
      const top = el.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop - 12
      panel.scrollTo({ top, behavior: "smooth" })
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
    el.animate(
      [
        { outline: "3px solid rgb(244 111 20 / 0.9)", outlineOffset: "2px" },
        { outline: "3px solid rgb(244 111 20 / 0)", outlineOffset: "2px" },
      ],
      { duration: 2400, easing: "ease-in" },
    )
  }, [highlight])
}

// ---------- 1. Pendientes ----------

function PendingOrder({ order: o }: { order: DiagnosticOrder }) {
  const [busy, startTransition] = useTransition()

  function register() {
    startTransition(async () => {
      const res = await registerSimulatedResult(o.id!)
      if (!res.ok) return void notify.error("No se pudo registrar el resultado", { description: res.error })
      notify.success(`Resultado de ${res.study} registrado`, {
        description:
          res.abnormal > 0
            ? `${res.abnormal} ${res.abnormal === 1 ? "valor" : "valores"} fuera de rango.`
            : o.kind === "imagen"
              ? "El informe ya está disponible."
              : "Todos los valores dentro del rango.",
      })
    })
  }

  return (
    <li id={`exam-order-${o.id}`} className="rounded-xl border-l-4 border-l-warning bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <p className="font-semibold">{o.study_name}</p>
        <StatusPill label="Pendiente" tone="warning" className="h-6 px-2.5 text-xs" />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Solicitado el {formatDateTime(o.requested_at!)}
        {o.doctor_name && ` · ${o.doctor_name}`}
      </p>
      {o.clinical_note && (
        <p className="mt-2 text-sm leading-relaxed">
          <span className="text-muted-foreground">Motivo: </span>
          {o.clinical_note}
        </p>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={register}
        disabled={busy}
        className="mt-2 -ml-2.5 text-muted-foreground hover:text-foreground"
      >
        <FlaskConical />
        {busy ? "Registrando…" : "Registrar resultado (simulado)"}
      </Button>
    </li>
  )
}

// ---------- 2. Laboratorio ----------

function LabStudyCard({ study }: { study: LabStudy }) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const outOfRange = study.analytes.filter((a) => a.points.at(-1)!.flag !== "normal").length

  function toggle(code: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (!next.delete(code)) next.add(code)
      return next
    })
  }

  return (
    <section id={`exam-study-${study.code}`} className="rounded-xl bg-card ring-1 ring-foreground/10">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h4 className="font-semibold">{study.name}</h4>
        {outOfRange > 0 ? (
          <StatusPill
            label={outOfRange === 1 ? "1 fuera de rango" : `${outOfRange} fuera de rango`}
            tone="critical"
            className="h-6 px-2.5 text-xs"
          />
        ) : (
          <StatusPill label="En rango" tone="ok" className="h-6 px-2.5 text-xs" />
        )}
      </header>
      <ul className="divide-y">
        {study.analytes.map((a) => (
          <AnalyteRow key={a.code} analyte={a} open={open.has(a.code)} onToggle={() => toggle(a.code)} />
        ))}
      </ul>
    </section>
  )
}

function AnalyteRow({ analyte: a, open, onToggle }: { analyte: Analyte; open: boolean; onToggle: () => void }) {
  const last = a.points.at(-1)!
  const prev = a.points.at(-2)
  const flag = FLAG[last.flag]

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 px-4 py-3 text-left outline-none hover:bg-muted/40 focus-visible:bg-muted/60"
      >
        <div className="min-w-0">
          <p className="font-medium">{a.name}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            Ref. {formatRange(a.low, a.high)} {a.unit}
          </p>
        </div>

        <LabSparkline points={a.points} low={a.low} high={a.high} />

        <div className="min-w-24 text-right">
          <p className={cn("text-lg leading-tight font-semibold tabular-nums", flag.text)}>
            {flag.symbol && (
              <span className="mr-1 text-xs align-middle" aria-hidden>
                {flag.symbol}
              </span>
            )}
            {formatNumber(last.value)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">{a.unit}</span>
            {last.flag !== "normal" && <span className="sr-only"> ({flag.label})</span>}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatShortDate(last.at)}
            {prev && ` · ${formatNumber(prev.value)} → ${formatNumber(last.value)}`}
          </p>
        </div>
      </button>

      {open && <AnalyteHistory analyte={a} />}
    </li>
  )
}

function AnalyteHistory({ analyte: a }: { analyte: Analyte }) {
  const rows = [...a.points].reverse()
  return (
    <div className="bg-muted/40 px-4 pt-2 pb-3">
      <p className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Historial · {rows.length} {rows.length === 1 ? "resultado" : "resultados"}
      </p>
      <table className="w-full text-sm tabular-nums">
        <tbody className="divide-y divide-foreground/5">
          {rows.map((p, i) => {
            const f = FLAG[p.flag]
            const before = rows[i + 1]
            return (
              <tr key={p.orderId}>
                <td className="py-1.5 text-muted-foreground">{formatShortDate(p.at)}</td>
                <td className={cn("py-1.5 text-right font-medium", f.text)}>
                  {formatNumber(p.value)} <span className="text-xs font-normal text-muted-foreground">{a.unit}</span>
                </td>
                <td className={cn("w-20 py-1.5 pl-3 text-xs", p.flag === "normal" ? "text-muted-foreground" : f.text)}>
                  {f.symbol} {f.label}
                </td>
                <td className="w-16 py-1.5 text-right text-xs text-muted-foreground">
                  {before && delta(p.value - before.value)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const delta = (d: number) => (d === 0 ? "=" : `${d > 0 ? "+" : "−"}${formatNumber(Math.abs(Number(d.toFixed(3))))}`)

// ---------- 3. Imagenología ----------

function ImagingCard({ order: o }: { order: DiagnosticOrder }) {
  const { body, conclusion } = splitReport(o.report ?? "")
  return (
    <article id={`exam-order-${o.id}`} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex gap-4">
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
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{o.study_name}</p>
          <p className="text-sm text-muted-foreground tabular-nums">{formatShortDate(o.resulted_at!)}</p>
          <dl className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {o.doctor_name && (
              <div>
                <dt className="inline">Solicitó: </dt>
                <dd className="inline text-foreground">{o.doctor_name}</dd>
              </div>
            )}
            {o.reported_by && (
              <div>
                <dt className="inline">Informó: </dt>
                <dd className="inline text-foreground">{o.reported_by}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
      {(body || conclusion) && (
        <div className="mt-4 space-y-2 border-t pt-3 text-sm leading-relaxed text-pretty">
          {body && <p>{body}</p>}
          {conclusion && <p className="rounded-lg bg-muted/60 px-3 py-2 font-semibold">{conclusion}</p>}
        </div>
      )}
    </article>
  )
}

// ---------- 4. Historial de solicitudes ----------

function OrderHistory({ orders }: { orders: DiagnosticOrder[] }) {
  const sorted = [...orders].sort((a, b) => b.requested_at!.localeCompare(a.requested_at!))
  return (
    <details className="group rounded-xl bg-card ring-1 ring-foreground/10">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3 font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <span>
          Historial de estudios <span className="font-normal text-muted-foreground tabular-nums">({orders.length})</span>
        </span>
        <ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <ul className="divide-y border-t">
        {sorted.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium">{o.study_name}</p>
              <p className="text-xs text-muted-foreground">
                <span className="tabular-nums">{formatShortDate(o.requested_at!)}</span>
                {o.doctor_name && ` · ${o.doctor_name}`}
              </p>
            </div>
            <StatusPill {...orderStatus(o.status, o.abnormal_count)} className="h-6 px-2.5 text-xs" />
          </li>
        ))}
      </ul>
    </details>
  )
}

function Block({
  title,
  count,
  icon: Icon,
  children,
}: {
  title: string
  count?: number
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        <Icon className="size-4" />
        {title}
        {count !== undefined && <span className="tabular-nums">({count})</span>}
      </h3>
      {children}
    </section>
  )
}
