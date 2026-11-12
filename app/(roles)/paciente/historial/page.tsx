import Link from "next/link"
import { Suspense } from "react"
import { ChevronDown, ClipboardList, FileText, MapPin, Pill, Stethoscope } from "lucide-react"
import { DataError } from "@/components/layout/data-error"
import { PatientExams } from "@/components/paciente/exams"
import { LiveRefresh } from "@/components/paciente/live-refresh"
import {
  PRESCRIPTION_ITEM_COLUMNS,
  PrescriptionItems,
  PrescriptionStatusBox,
  type PrescriptionItemRow,
} from "@/components/paciente/prescription"
import { PRESCRIPTION_STATUS, StatusPill } from "@/components/paciente/status"
import { capitalize, folioLabel, formatDate, formatDayParts, formatShortDate, placeLabel } from "@/lib/format"
import { getCurrentPatient, type CurrentPatient } from "@/lib/session"
import { supabase, type Views } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type EncounterRow = Views<"v_encounters">

// La pestaña va en la URL (?tab=examenes): el inicio enlaza directo a un resultado.
const TABS = [
  { key: "consultas", label: "Consultas", hint: "Sus consultas médicas." },
  { key: "recetas", label: "Recetas", hint: "Toque una receta para ver sus medicamentos." },
  { key: "examenes", label: "Exámenes", hint: "Toque un resultado para ver el detalle." },
] as const
type Tab = (typeof TABS)[number]["key"]

export default function Page({ searchParams }: PageProps<"/paciente/historial">) {
  return (
    <main className="space-y-5 px-4 py-5">
      <h1 className="text-2xl font-semibold tracking-tight">Mi historial</h1>
      {/* searchParams es dato de la request: se lee dentro de Suspense (cacheComponents). */}
      <Suspense fallback={<HistorySkeleton />}>
        <HistoryTabs searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function HistoryTabs({ searchParams }: { searchParams: PageProps<"/paciente/historial">["searchParams"] }) {
  const params = await searchParams
  const tab: Tab = TABS.some((t) => t.key === params.tab) ? (params.tab as Tab) : "consultas"
  const openId = typeof params.abrir === "string" ? params.abrir : undefined

  return (
    <>
      <p className="-mt-4 text-muted-foreground">{TABS.find((t) => t.key === tab)!.hint}</p>
      <nav aria-label="Secciones del historial" className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/paciente/historial?tab=${t.key}`}
            replace
            scroll={false}
            aria-current={t.key === tab ? "page" : undefined}
            className={cn(
              "flex h-12 items-center justify-center rounded-xl text-base font-medium text-muted-foreground transition-colors",
              t.key === tab && "bg-card text-foreground shadow-sm",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <Suspense key={tab} fallback={<HistorySkeleton />}>
        <History tab={tab} openId={openId} />
      </Suspense>
    </>
  )
}

async function History({ tab, openId }: { tab: Tab; openId?: string }) {
  const patient = await getCurrentPatient()
  if (!patient) return <DataError />
  if (tab === "examenes") return <Exams patient={patient} openId={openId} />

  // Solo atenciones cerradas: la receta existe recién al terminar la consulta.
  const [{ data: encounters, error }, { data: places }] = await Promise.all([
    supabase
      .from("v_encounters")
      .select("*")
      .eq("patient_id", patient.id)
      .not("finished_at", "is", null)
      .order("started_at", { ascending: false }),
    supabase.from("establishments").select("code, zone"),
  ])
  if (error) return <DataError />

  const rxIds = (encounters ?? []).flatMap((e) => (e.prescription_id ? [e.prescription_id] : []))
  const { data: items } = rxIds.length
    ? await supabase
        .from("v_prescription_items")
        .select(PRESCRIPTION_ITEM_COLUMNS)
        .in("prescription_id", rxIds)
        .order("line_no")
    : { data: [] }

  const zones = new Map((places ?? []).map((p) => [p.code, p.zone]))
  const itemsByRx = Map.groupBy(items ?? [], (it) => it.prescription_id!)

  if (tab === "recetas") {
    const withRx = (encounters ?? []).filter((e) => e.prescription_id)
    return (
      <>
        <LiveRefresh patientId={patient.id} />
        {withRx.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            <Pill className="size-7" />
            Todavía no tiene recetas.
          </div>
        ) : (
          <ol className="space-y-3">
            {withRx.map((enc) => (
              <li key={enc.id}>
                <PrescriptionCard enc={enc} items={itemsByRx.get(enc.prescription_id!) ?? []} />
              </li>
            ))}
          </ol>
        )}
      </>
    )
  }

  return (
    <>
      <LiveRefresh patientId={patient.id} />
      {!encounters?.length ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          <ClipboardList className="size-7" />
          Todavía no tiene consultas registradas.
        </div>
      ) : (
        <ol className="space-y-3">
          {encounters.map((enc) => (
            <li key={enc.id}>
              <EncounterCard
                enc={enc}
                zone={zones.get(enc.establishment_code!) ?? ""}
                items={enc.prescription_id ? (itemsByRx.get(enc.prescription_id) ?? []) : []}
              />
            </li>
          ))}
        </ol>
      )}
    </>
  )
}

function EncounterCard({ enc, zone, items }: { enc: EncounterRow; zone: string; items: PrescriptionItemRow[] }) {
  const day = formatDayParts(enc.started_at!)

  return (
    <article className="rounded-2xl bg-card p-4 shadow-xs ring-1 ring-foreground/5">
      <div className="flex gap-4">
        <div
          className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-muted py-2 leading-none text-muted-foreground"
          aria-hidden
        >
          <span className="text-xs font-medium uppercase">{day.weekday}</span>
          <span className="my-1 text-2xl font-semibold tabular-nums">{day.day}</span>
          <span className="text-xs font-medium uppercase">{day.month}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground tabular-nums">{formatShortDate(enc.started_at!)}</p>
          <p className="font-semibold">{enc.diagnosis_label ?? "Consulta"}</p>
          {enc.chief_complaint && (
            <p className="text-sm text-muted-foreground">Motivo: {capitalize(enc.chief_complaint)}</p>
          )}
        </div>
      </div>

      <dl className="mt-3 space-y-1.5 text-muted-foreground">
        <div className="flex items-start gap-2">
          <dt className="sr-only">Médico</dt>
          <Stethoscope className="mt-0.5 size-4 shrink-0 text-primary" />
          <dd>
            <span className="font-medium text-foreground">{enc.specialty_name}</span> · {enc.doctor_name}
          </dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="sr-only">Lugar</dt>
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
          <dd>{placeLabel(enc.establishment_name!, zone)}</dd>
        </div>
      </dl>

      {enc.prescription_id ? (
        <Link
          href="/paciente/historial?tab=recetas"
          className="mt-4 flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2"
        >
          <FileText className="size-5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Receta {folioLabel(enc.prescription_folio!)}</span>
            <span className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "medicamento" : "medicamentos"}
            </span>
          </span>
          <StatusPill {...PRESCRIPTION_STATUS[enc.prescription_status!]} />
        </Link>
      ) : (
        <p className="mt-4 rounded-xl bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
          En esta consulta no se recetaron medicamentos.
        </p>
      )}
    </article>
  )
}

/** Pestaña Recetas: una tarjeta por receta, con sus medicamentos al tocarla. */
function PrescriptionCard({ enc, items }: { enc: EncounterRow; items: PrescriptionItemRow[] }) {
  const status = enc.prescription_status!
  return (
    <details className="group rounded-2xl bg-card shadow-xs ring-1 ring-foreground/5">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
        <FileText className="size-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 py-2">
          <span className="block font-medium whitespace-nowrap">Receta {folioLabel(enc.prescription_folio!)}</span>
          <span className="block text-sm text-muted-foreground">
            {capitalize(formatDate(enc.started_at!))} · {enc.doctor_name}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusPill {...PRESCRIPTION_STATUS[status]} />
            <span className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "medicamento" : "medicamentos"}
            </span>
          </span>
        </span>
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t px-3 pt-3 pb-3">
        <PrescriptionStatusBox status={status} />
        <div className="mt-2">
          <PrescriptionItems items={items} partial={status === "parcial"} />
        </div>
      </div>
    </details>
  )
}

async function Exams({ patient, openId }: { patient: CurrentPatient; openId?: string }) {
  const [orders, results] = await Promise.all([
    supabase.from("v_diagnostic_orders").select("*").eq("patient_id", patient.id).order("requested_at", { ascending: false }),
    supabase.from("v_lab_results").select("*").eq("patient_id", patient.id),
  ])
  if (orders.error || results.error) return <DataError />

  return (
    <>
      <LiveRefresh patientId={patient.id} />
      <PatientExams orders={orders.data} results={results.data} openId={openId} />
    </>
  )
}

function HistorySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-60 animate-pulse rounded-2xl bg-card ring-1 ring-foreground/5" />
      ))}
    </div>
  )
}
