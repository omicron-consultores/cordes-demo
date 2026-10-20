import { connection } from "next/server"
import { Suspense } from "react"
import { DataError } from "@/components/layout/data-error"
import { DoctorAgenda } from "@/components/medico/doctor-agenda"
import { DoctorSwitcher, type DoctorChoice } from "@/components/medico/doctor-switcher"
import { boToday, placeLabel } from "@/lib/format"
import { getCurrentDoctor } from "@/lib/session"
import { supabase } from "@/lib/supabase"

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
      <Suspense fallback={<AgendaSkeleton />}>
        <Agenda />
      </Suspense>
    </main>
  )
}

async function Agenda() {
  await connection() // la fecha de hoy se calcula por request
  const today = boToday()
  const doctor = await getCurrentDoctor()
  if (!doctor) return <DataError message="No se encontró el médico. Elija uno desde la pantalla de inicio." />

  const [appointments, doctors] = await Promise.all([
    supabase
      .from("v_appointments")
      .select("*")
      .eq("doctor_id", doctor.id)
      .eq("local_date", today)
      .order("scheduled_at"),
    supabase
      .from("doctors")
      .select("id, license_number, full_name, specialties(name), establishments(name, zone)")
      .eq("active", true)
      .order("full_name"),
  ])
  if (appointments.error || doctors.error) return <DataError />

  // Alergias de los pacientes del día: se ven antes de entrar a la consulta.
  const patientIds = [...new Set(appointments.data.map((a) => a.patient_id!))]
  const allergies = patientIds.length
    ? await supabase.from("patients").select("id, allergies").in("id", patientIds)
    : { data: [], error: null }
  if (allergies.error) return <DataError />

  const choices: DoctorChoice[] = doctors.data.map((d) => ({
    license: d.license_number,
    name: d.full_name,
    specialty: d.specialties?.name ?? "",
    place: d.establishments ? placeLabel(d.establishments.name, d.establishments.zone) : "",
  }))
  const current = choices.find((c) => c.license === doctor.license_number)

  return (
    <DoctorAgenda
      doctorId={doctor.id}
      today={today}
      appointments={appointments.data}
      allergies={Object.fromEntries(allergies.data.map((p) => [p.id, p.allergies]))}
      header={
        <DoctorSwitcher
          current={doctor.license_number}
          name={doctor.name}
          subtitle={current ? doctorSubtitle(current) : ""}
          doctors={choices}
        />
      }
    />
  )
}

/** "Pediatría · Policlínico Sacaba"; sin repetir la especialidad si ya está en el nombre del lugar. */
function doctorSubtitle({ specialty, place }: DoctorChoice): string {
  return place.includes(specialty) ? place : [specialty, place].filter(Boolean).join(" · ")
}

function AgendaSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-14 w-96 animate-pulse rounded-lg bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <div className="h-112 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
    </div>
  )
}
