import Link from "next/link"
import { Suspense } from "react"
import { CalendarClock, CalendarPlus, ChevronRight, Pill, TriangleAlert } from "lucide-react"
import { DataError } from "@/components/layout/data-error"
import { AppointmentCard } from "@/components/paciente/appointment-card"
import { LiveRefresh } from "@/components/paciente/live-refresh"
import { PRESCRIPTION_STATUS, StatusPill } from "@/components/paciente/status"
import { buttonVariants } from "@/components/ui/button"
import { boToday, capitalize, folioLabel, formatDate, formatNumber, unitLabel } from "@/lib/format"
import { getCurrentPatient, type CurrentPatient } from "@/lib/session"
import { supabase } from "@/lib/supabase"

export default function Page() {
  return (
    <main className="space-y-6 px-4 py-5">
      <Suspense fallback={<HomeSkeleton />}>
        <PatientHome />
      </Suspense>
    </main>
  )
}

async function PatientHome() {
  const patient = await getCurrentPatient()
  if (!patient) return <DataError />

  return (
    <>
      <LiveRefresh patientId={patient.id} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hola, {patient.firstNames}</h1>
        <p className="text-muted-foreground">Matrícula {patient.matricula}</p>
      </div>
      <Allergies allergies={patient.allergies} />
      <NextAppointment patient={patient} />
      <LatestPrescription patient={patient} />
    </>
  )
}

function Allergies({ allergies }: { allergies: string[] }) {
  if (allergies.length === 0) return null
  return (
    <section
      aria-label="Alergias"
      className="flex gap-3 rounded-2xl border border-critical/25 bg-critical/5 p-4"
    >
      <TriangleAlert className="mt-0.5 size-6 shrink-0 text-critical" />
      <div>
        <p className="font-semibold text-critical">
          Tiene alergia a: {allergies.map(capitalize).join(", ")}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Recuérdelo siempre a su médico y en Farmacia.
        </p>
      </div>
    </section>
  )
}

async function NextAppointment({ patient }: { patient: CurrentPatient }) {
  const { data: next, error } = await supabase
    .from("v_appointments")
    .select("*")
    .eq("patient_id", patient.id)
    .in("status", ["programada", "en_atencion"])
    .gte("local_date", boToday())
    .order("scheduled_at")
    .limit(1)
    .maybeSingle()
  if (error) return <DataError />

  return (
    <section aria-labelledby="proxima-cita" className="space-y-3">
      <SectionTitle id="proxima-cita" title="Su próxima cita" href="/paciente/citas" linkLabel="Mis citas" />
      {next ? (
        <AppointmentCard appt={next} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-6 text-center">
          <CalendarClock className="size-7 text-muted-foreground" />
          <p className="text-muted-foreground">No tiene citas programadas.</p>
          <Link href="/paciente/citas/nueva" className={buttonVariants({ size: "xl", className: "w-full" })}>
            <CalendarPlus />
            Agendar una cita
          </Link>
        </div>
      )}
    </section>
  )
}

async function LatestPrescription({ patient }: { patient: CurrentPatient }) {
  const { data: enc, error } = await supabase
    .from("v_encounters")
    .select("prescription_id, prescription_folio, prescription_status, started_at, doctor_name, specialty_name")
    .eq("patient_id", patient.id)
    .not("prescription_id", "is", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return <DataError />

  let body: React.ReactNode = (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
      <Pill className="size-7" />
      Todavía no tiene recetas.
    </div>
  )

  if (enc?.prescription_id) {
    const { data: items } = await supabase
      .from("v_prescription_items")
      .select("id, medication_name, concentration, form, dose, frequency, quantity_prescribed, quantity_dispensed")
      .eq("prescription_id", enc.prescription_id)
      .order("line_no")
    const status = PRESCRIPTION_STATUS[enc.prescription_status!]

    body = (
      <article className="rounded-2xl bg-card p-4 shadow-xs ring-1 ring-foreground/5">
        <p className="font-semibold">Receta {folioLabel(enc.prescription_folio!)}</p>
        <p className="text-sm text-muted-foreground">
          {capitalize(formatDate(enc.started_at!))} · {enc.doctor_name}
        </p>
        <div className="mt-3 rounded-xl bg-muted/60 p-3">
          <StatusPill {...status} className="h-8 text-base" />
          <p className="mt-1.5 text-sm text-muted-foreground">{status.hint}</p>
        </div>
        <ul className="mt-3 divide-y">
          {(items ?? []).map((it) => {
            const prescribed = it.quantity_prescribed ?? 0
            const dispensed = it.quantity_dispensed ?? 0
            return (
              <li key={it.id} className="flex items-start gap-3 py-3 last:pb-0">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                  <Pill className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {it.medication_name} {it.concentration}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {it.dose}, {it.frequency}
                  </p>
                </div>
                <p className="shrink-0 text-right text-sm tabular-nums">
                  <span className="font-semibold">{formatNumber(prescribed)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {enc.prescription_status === "parcial" && dispensed < prescribed
                      ? `recibió ${formatNumber(dispensed)}`
                      : unitLabel(it.form ?? "", prescribed)}
                  </span>
                </p>
              </li>
            )
          })}
        </ul>
      </article>
    )
  }

  return (
    <section aria-labelledby="receta" className="space-y-3">
      <SectionTitle id="receta" title="Su receta más reciente" href="/paciente/historial" linkLabel="Historial" />
      {body}
    </section>
  )
}

function SectionTitle({ id, title, href, linkLabel }: { id: string; title: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      <Link href={href} className="flex items-center text-sm font-medium text-primary">
        {linkLabel}
        <ChevronRight className="size-4" />
      </Link>
    </div>
  )
}

function HomeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-14 w-2/3 animate-pulse rounded-lg bg-muted" />
      <div className="h-20 animate-pulse rounded-2xl bg-muted" />
      <div className="h-44 animate-pulse rounded-2xl bg-card ring-1 ring-foreground/5" />
      <div className="h-56 animate-pulse rounded-2xl bg-card ring-1 ring-foreground/5" />
    </div>
  )
}
