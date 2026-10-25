import Link from "next/link"
import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"
import { CONTAINER } from "@/components/layout/container"
import { DataError } from "@/components/layout/data-error"
import { EncounterForm } from "@/components/medico/encounter-form"
import { EncounterSummary } from "@/components/medico/encounter-summary"
import { PatientContext, type PastEncounter } from "@/components/medico/patient-context"
import { StatusPill } from "@/components/paciente/status"
import { buttonVariants } from "@/components/ui/button"
import { age, formatDateTime, formatTime } from "@/lib/format"
import { supabase } from "@/lib/supabase"

const HISTORY_LIMIT = 10

export default function Page({ params }: PageProps<"/medico/atencion/[id]">) {
  return (
    <main className={`${CONTAINER} flex-1 py-6 lg:py-8`}>
      <Link href="/medico" className={buttonVariants({ variant: "ghost", className: "-ml-3 mb-3" })}>
        <ArrowLeft />
        Volver a la agenda
      </Link>
      <Suspense fallback={<EncounterSkeleton />}>
        <Encounter params={params} />
      </Suspense>
    </main>
  )
}

async function Encounter({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: encounter, error } = await supabase.from("v_encounters").select("*").eq("id", id).maybeSingle()
  if (error) return <DataError />
  if (!encounter) return <DataError message="No se encontró la atención. Vuelva a la agenda e iníciela de nuevo." />

  const [patient, history, cie10, medications] = await Promise.all([
    supabase.from("patients").select("*").eq("id", encounter.patient_id!).single(),
    supabase
      .from("v_encounters")
      .select("*")
      .eq("patient_id", encounter.patient_id!)
      .neq("id", id)
      .not("finished_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase.from("cie10").select("code, label").order("code"),
    supabase
      .from("v_medication_stock")
      .select("code, name, form, concentration, available, stock_status, allergen_group")
      .order("name"),
  ])
  if (patient.error || history.error || cie10.error || medications.error) return <DataError />

  const rxIds = history.data.flatMap((e) => (e.prescription_id ? [e.prescription_id] : []))
  const items = rxIds.length
    ? await supabase
        .from("v_prescription_items")
        .select("prescription_id, medication_name, concentration, quantity_prescribed")
        .in("prescription_id", rxIds)
        .order("line_no")
    : { data: [], error: null }
  if (items.error) return <DataError />

  const itemsByRx = Map.groupBy(items.data, (it) => it.prescription_id!)
  const past: PastEncounter[] = history.data.map((e) => ({
    ...e,
    medications: e.prescription_id
      ? (itemsByRx.get(e.prescription_id) ?? []).map((it) =>
          [it.medication_name, it.concentration].filter(Boolean).join(" "),
        )
      : [],
  }))

  const p = patient.data
  const closed = encounter.finished_at !== null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {p.first_names} {p.last_names}
          </h1>
          <p className="text-muted-foreground">
            <span className="tabular-nums">{p.matricula}</span> · {age(p.birth_date)} años ·{" "}
            {p.sex === "F" ? "Femenino" : "Masculino"} · {encounter.specialty_name}, {encounter.doctor_name}
          </p>
        </div>
        {closed ? (
          <StatusPill label={`Atención cerrada · ${formatDateTime(encounter.finished_at!)}`} tone="ok" />
        ) : (
          <StatusPill label={`En consulta desde las ${formatTime(encounter.started_at!)}`} tone="warning" />
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <PatientContext patient={p} history={past} />
        {closed ? (
          <EncounterSummary encounter={encounter} />
        ) : (
          <EncounterForm
            encounterId={encounter.id!}
            initialComplaint={encounter.chief_complaint ?? ""}
            lastHeight={history.data.find((e) => e.height_cm !== null)?.height_cm ?? null}
            cie10={cie10.data}
            medications={medications.data.map((m) => ({
              code: m.code!,
              name: m.name!,
              form: m.form!,
              concentration: m.concentration,
              available: m.available ?? 0,
              stock_status: m.stock_status ?? "ok",
              allergen_group: m.allergen_group,
            }))}
            patient={{ name: p.first_names, sex: p.sex, allergies: p.allergies }}
          />
        )}
      </div>
    </div>
  )
}

function EncounterSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-14 w-96 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-6 lg:grid-cols-[5fr_7fr]">
        <div className="h-160 animate-pulse rounded-xl bg-muted" />
        <div className="h-160 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
      </div>
    </div>
  )
}
