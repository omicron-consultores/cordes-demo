"use client"

import { useState } from "react"
import { ChevronDown, FileText, FlaskConical, ScanLine } from "lucide-react"
import { PRESCRIPTION_STATUS, StatusPill } from "@/components/paciente/status"
import { Button } from "@/components/ui/button"
import { orderStatus } from "@/lib/exams"
import { folioLabel, formatShortDate, unitLabel } from "@/lib/format"
import type { Views } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { useExamLink } from "./context-tabs"

export type RxLine = {
  name: string
  form: string
  detail: string
  prescribed: number
  dispensed: number
}
/** `target`: id del estudio en la pestaña Exámenes (`examTarget`). */
export type OrderedStudy = { id: string; name: string; kind: string; status: string; abnormal: number; target: string }
export type PastEncounter = Views<"v_encounters"> & { lines: RxLine[]; studies: OrderedStudy[] }

const decimal = (n: number) => String(n).replace(".", ",")

/** Pestaña "Consultas": atenciones anteriores, de la más reciente a la más antigua. */
export function EncounterTimeline({
  encounters,
  specialty,
}: {
  encounters: PastEncounter[]
  specialty: string | null
}) {
  const [onlyMine, setOnlyMine] = useState(false)
  const [open, setOpen] = useState<Set<string>>(() => new Set(encounters[0] ? [encounters[0].id!] : []))

  if (encounters.length === 0) {
    return <p className="rounded-xl bg-muted/60 px-4 py-3 text-muted-foreground">Primera atención registrada del paciente.</p>
  }

  const visible = onlyMine ? encounters.filter((e) => e.specialty_name === specialty) : encounters
  const allOpen = visible.length > 0 && visible.every((e) => open.has(e.id!))

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
            className="size-4 accent-primary"
          />
          Solo mi especialidad
          {specialty && <span className="text-muted-foreground">({specialty})</span>}
        </label>
        <Button
          variant="ghost"
          size="sm"
          disabled={visible.length === 0}
          onClick={() => setOpen(allOpen ? new Set() : new Set(visible.map((e) => e.id!)))}
        >
          {allOpen ? "Contraer todo" : "Expandir todo"}
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl bg-muted/60 px-4 py-3 text-muted-foreground">
          No hay consultas anteriores de {specialty ?? "esta especialidad"}.
        </p>
      ) : (
        <ol className="relative space-y-3 before:absolute before:top-3 before:bottom-3 before:left-[5px] before:w-px before:bg-border">
          {visible.map((e) => (
            <TimelineItem key={e.id} enc={e} open={open.has(e.id!)} onToggle={() => toggle(e.id!)} />
          ))}
        </ol>
      )}
    </div>
  )
}

function TimelineItem({ enc, open, onToggle }: { enc: PastEncounter; open: boolean; onToggle: () => void }) {
  const vitals = [
    enc.bp_systolic !== null && `PA ${enc.bp_systolic}/${enc.bp_diastolic}`,
    enc.weight_kg !== null && `${decimal(enc.weight_kg)} kg`,
  ].filter(Boolean)

  return (
    <li className="relative pl-6">
      <span
        aria-hidden
        className={cn(
          "absolute top-5 left-0 size-[11px] rounded-full ring-4 ring-background",
          open ? "bg-primary" : "bg-muted-foreground/40",
        )}
      />
      <article className="rounded-xl bg-card ring-1 ring-foreground/10">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-start gap-3 rounded-xl p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium text-muted-foreground tabular-nums">{formatShortDate(enc.started_at!)}</p>
            <p className="leading-snug font-semibold">
              {enc.diagnosis_code && <span className="mr-1.5 text-primary tabular-nums">{enc.diagnosis_code}</span>}
              {enc.diagnosis_label ?? "Consulta sin diagnóstico"}
            </p>
            <p className="text-sm text-muted-foreground">
              {enc.doctor_name} · {enc.specialty_name}
            </p>
            {vitals.length > 0 && (
              <p className="flex flex-wrap gap-1.5 pt-1">
                {vitals.map((v) => (
                  <span key={v as string} className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
                    {v}
                  </span>
                ))}
              </p>
            )}
          </div>
          <ChevronDown
            className={cn("mt-1 size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          />
        </button>

        {open && <EncounterDetail enc={enc} />}
      </article>
    </li>
  )
}

function EncounterDetail({ enc }: { enc: PastEncounter }) {
  const { openExam } = useExamLink()
  const voided = enc.prescription_status === "anulada"
  return (
    <div className="space-y-5 border-t px-4 pt-4 pb-5">
      <Field label="Motivo" value={enc.chief_complaint} />
      <Field label="Hallazgos" value={enc.findings} />
      {enc.diagnosis_code && (
        <Field label="Diagnóstico" value={`${enc.diagnosis_code} · ${enc.diagnosis_label}`} note={enc.diagnosis_notes} />
      )}
      <Field label="Plan" value={enc.plan} />

      {enc.prescription_id && (
        <section>
          <Label>Receta</Label>
          <p className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            <FileText className="size-4 text-primary" />
            <span className="font-medium tabular-nums">{folioLabel(enc.prescription_folio!)}</span>
            <StatusPill {...PRESCRIPTION_STATUS[enc.prescription_status!]} className="h-6 px-2.5 text-xs" />
          </p>
          <ul className="divide-y rounded-lg bg-muted/40">
            {enc.lines.map((l, i) => (
              <li key={i} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{l.name}</p>
                  <p className="text-muted-foreground">
                    {l.detail && `${l.detail} · `}
                    <span className="tabular-nums">
                      {l.prescribed} {unitLabel(l.form, l.prescribed)}
                    </span>
                  </p>
                </div>
                {!voided && <StatusPill {...lineStatus(l)} className="h-6 px-2.5 text-xs" />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {enc.studies.length > 0 && (
        <section>
          <Label>Estudios solicitados</Label>
          <ul className="flex flex-wrap gap-2">
            {enc.studies.map((s) => {
              const Icon = s.kind === "imagen" ? ScanLine : FlaskConical
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => openExam(s.target)}
                    title="Ver en Exámenes"
                    className="inline-flex items-center gap-2 rounded-lg bg-muted/60 py-1 pr-1 pl-2.5 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="underline decoration-foreground/20 underline-offset-2">{s.name}</span>
                    <StatusPill {...orderStatus(s.status, s.abnormal)} className="h-6 px-2.5 text-xs" />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

function lineStatus(l: RxLine) {
  if (l.dispensed >= l.prescribed) return { label: "Entregada", tone: "ok" } as const
  if (l.dispensed > 0) return { label: `Parcial ${l.dispensed}/${l.prescribed}`, tone: "warning" } as const
  return { label: "Pendiente", tone: "muted" } as const
}

function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{children}</h3>
}

function Field({ label, value, note }: { label: string; value: string | null; note?: string | null }) {
  if (!value) return null
  return (
    <section>
      <Label>{label}</Label>
      <p className="max-w-prose text-sm leading-relaxed text-pretty whitespace-pre-line">{value}</p>
      {note && <p className="mt-1 max-w-prose text-sm leading-relaxed text-pretty text-muted-foreground">{note}</p>}
    </section>
  )
}
