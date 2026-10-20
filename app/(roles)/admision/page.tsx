import { connection } from "next/server"
import { Suspense } from "react"
import { AgendaBoard, type DoctorOption, type EstablishmentOption } from "@/components/admision/agenda-board"
import { DataError } from "@/components/layout/data-error"
import { boToday, nextWorkingDays, placeLabel } from "@/lib/format"
import { supabase } from "@/lib/supabase"

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
      <Suspense fallback={<AgendaSkeleton />}>
        <Agenda />
      </Suspense>
    </main>
  )
}

async function Agenda() {
  await connection() // la fecha de hoy se calcula por request
  const today = boToday()

  const [appointments, establishments, doctors] = await Promise.all([
    supabase.from("v_appointments").select("*").eq("local_date", today).order("scheduled_at"),
    supabase.from("establishments").select("code, name, zone").eq("active", true).order("name"),
    supabase
      .from("doctors")
      .select("id, full_name, establishment_code, specialties(name)")
      .eq("active", true)
      .order("full_name"),
  ])
  if (appointments.error || establishments.error || doctors.error) return <DataError />

  const establishmentOptions: EstablishmentOption[] = establishments.data.map((e) => ({
    code: e.code,
    label: placeLabel(e.name, e.zone),
  }))
  const doctorOptions: DoctorOption[] = doctors.data.map((d) => ({
    id: d.id,
    name: d.full_name,
    specialty: d.specialties?.name ?? "",
    establishmentCode: d.establishment_code,
  }))

  return (
    <AgendaBoard
      today={today}
      appointments={appointments.data}
      establishments={establishmentOptions}
      doctors={doctorOptions}
      bookingDays={nextWorkingDays(today, 10)}
    />
  )
}

function AgendaSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-12 w-80 animate-pulse rounded-lg bg-muted" />
      <div className="h-11 animate-pulse rounded-xl bg-muted" />
      <div className="h-112 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
    </div>
  )
}
