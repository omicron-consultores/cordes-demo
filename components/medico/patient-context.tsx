import { Activity, ClipboardList, FileText, HeartPulse, ShieldAlert } from "lucide-react"
import { PRESCRIPTION_STATUS, StatusPill } from "@/components/paciente/status"
import { capitalize, folioLabel, formatShortDate } from "@/lib/format"
import type { Tables, Views } from "@/lib/supabase"
import { VitalsTrend, type VitalsPoint } from "./vitals-trend"

export type PastEncounter = Views<"v_encounters"> & { medications: string[] }

const TREND_POINTS = 8

/** Columna de contexto: alertas, datos básicos, evolución de signos vitales y atenciones anteriores. */
export function PatientContext({ patient, history }: { patient: Tables<"patients">; history: PastEncounter[] }) {
  const trend: VitalsPoint[] = history
    .filter((e) => e.bp_systolic !== null || e.weight_kg !== null)
    .slice(0, TREND_POINTS)
    .reverse()
    .map((e) => ({
      date: formatShortDate(e.started_at!).slice(0, 5),
      systolic: e.bp_systolic,
      diastolic: e.bp_diastolic,
      weight: e.weight_kg,
    }))

  return (
    <aside className="space-y-4" aria-label="Contexto del paciente">
      <Alerts allergies={patient.allergies} conditions={patient.chronic_conditions} />

      <Section title="Datos del asegurado">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Fact label="Fecha de nacimiento" value={formatShortDate(patient.birth_date)} />
          <Fact label="Grupo sanguíneo" value={patient.blood_type} />
          <Fact label="Asegurado" value={`${capitalize(patient.insured_type)} · ${patient.affiliation_sector}`} />
          <Fact label="Teléfono" value={patient.phone} />
        </dl>
      </Section>

      <Section title="Evolución" icon={Activity}>
        <VitalsTrend points={trend} />
      </Section>

      <Section title="Atenciones anteriores" icon={ClipboardList}>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Primera atención registrada del paciente.</p>
        ) : (
          <ol className="-mx-4 divide-y">
            {history.map((e) => (
              <PastEncounterItem key={e.id} enc={e} />
            ))}
          </ol>
        )}
      </Section>
    </aside>
  )
}

function Alerts({ allergies, conditions }: { allergies: string[]; conditions: string[] }) {
  return (
    <div className="space-y-2">
      {allergies.length > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-critical/30 bg-critical/10 p-4 text-critical">
          <ShieldAlert className="mt-0.5 size-6 shrink-0" />
          <div>
            <p className="text-xs font-bold tracking-wider uppercase">Alergias</p>
            <p className="text-lg font-semibold">{allergies.map(capitalize).join(", ")}</p>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">Sin alergias conocidas.</p>
      )}
      {conditions.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/12 p-4 text-[#86601f]">
          <HeartPulse className="mt-0.5 size-6 shrink-0" />
          <div>
            <p className="text-xs font-bold tracking-wider uppercase">Condiciones crónicas</p>
            <p className="font-semibold">{conditions.map(capitalize).join(" · ")}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function PastEncounterItem({ enc }: { enc: PastEncounter }) {
  const vitals = [
    enc.bp_systolic !== null && `PA ${enc.bp_systolic}/${enc.bp_diastolic}`,
    enc.weight_kg !== null && `${String(enc.weight_kg).replace(".", ",")} kg`,
  ].filter(Boolean)

  return (
    <li className="space-y-1.5 px-4 py-3 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium">
          {enc.diagnosis_label ?? "Consulta sin diagnóstico"}
          {enc.diagnosis_code && <span className="ml-1.5 text-muted-foreground tabular-nums">{enc.diagnosis_code}</span>}
        </p>
        <span className="shrink-0 text-muted-foreground tabular-nums">{formatShortDate(enc.started_at!)}</span>
      </div>
      <p className="text-muted-foreground">
        {enc.specialty_name} · {enc.doctor_name}
        {vitals.length > 0 && <span className="tabular-nums"> · {vitals.join(" · ")}</span>}
      </p>
      {enc.prescription_id ? (
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-medium tabular-nums">{folioLabel(enc.prescription_folio!)}</span>
              <StatusPill {...PRESCRIPTION_STATUS[enc.prescription_status!]} className="h-6 px-2.5 text-xs" />
            </p>
            <p className="mt-0.5 text-muted-foreground">{enc.medications.join(" · ")}</p>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground italic">Sin receta.</p>
      )}
    </li>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {Icon && <Icon className="size-4" />}
        {title}
      </h2>
      {children}
    </section>
  )
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={value ? "font-medium" : "text-muted-foreground italic"}>{value || "Sin registrar"}</dd>
    </div>
  )
}
