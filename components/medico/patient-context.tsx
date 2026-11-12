import { Activity, HeartPulse, ShieldAlert } from "lucide-react"
import type { DiagnosticOrder, LabStudy } from "@/lib/exams"
import { capitalize, formatShortDate } from "@/lib/format"
import type { Tables } from "@/lib/supabase"
import { ContextTabs } from "./context-tabs"
import { EncounterTimeline, type PastEncounter } from "./encounter-timeline"
import { ExamsPanel } from "./exams-panel"
import { VitalsTrend, type VitalsPoint } from "./vitals-trend"

const TREND_POINTS = 8

/**
 * Columna de contexto en pestañas: Resumen (alertas, datos, evolución), Consultas anteriores y Exámenes.
 * En escritorio tiene scroll propio para que el formulario de la derecha siga visible.
 */
export function PatientContext({
  patient,
  history,
  specialty,
  orders,
  lab,
  flaggedStudies,
}: {
  patient: Tables<"patients">
  history: PastEncounter[]
  /** Especialidad de la atención actual (filtro "Solo mi especialidad"). */
  specialty: string | null
  orders: DiagnosticOrder[]
  lab: LabStudy[]
  /** Insignia de la pestaña Exámenes (ver `flaggedStudies` en lib/exams.ts). */
  flaggedStudies: number
}) {
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
    <aside className="lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)]" aria-label="Contexto del paciente">
      <ContextTabs
        consultasCount={history.length}
        flagged={flaggedStudies}
        resumen={
          <div className="space-y-4">
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
          </div>
        }
        consultas={<EncounterTimeline encounters={history} specialty={specialty} />}
        examenes={<ExamsPanel patientId={patient.id} orders={orders} lab={lab} />}
      />
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
