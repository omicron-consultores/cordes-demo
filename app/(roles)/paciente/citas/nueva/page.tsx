import { Suspense } from "react"
import { DataError } from "@/components/layout/data-error"
import { BookingWizard, type DoctorOption } from "@/components/paciente/booking-wizard"
import { boToday, nextWorkingDays, placeLabel } from "@/lib/format"
import { supabase } from "@/lib/supabase"

export default function Page() {
  return (
    <main>
      <Suspense fallback={<WizardSkeleton />}>
        <Wizard />
      </Suspense>
    </main>
  )
}

async function Wizard() {
  const [specialties, doctors] = await Promise.all([
    supabase.from("specialties").select("code, name").order("name"),
    supabase
      .from("doctors")
      .select("id, full_name, specialty_code, establishments(name, zone)")
      .eq("active", true)
      .order("full_name"),
  ])
  if (specialties.error || doctors.error) {
    return (
      <div className="p-4">
        <DataError />
      </div>
    )
  }

  const doctorOptions: DoctorOption[] = doctors.data.map((d) => ({
    id: d.id,
    name: d.full_name,
    specialtyCode: d.specialty_code,
    place: d.establishments ? placeLabel(d.establishments.name, d.establishments.zone) : "",
  }))
  // Solo especialidades con al menos un médico activo.
  const offered = specialties.data.filter((s) => doctorOptions.some((d) => d.specialtyCode === s.code))

  return <BookingWizard specialties={offered} doctors={doctorOptions} days={nextWorkingDays(boToday(), 10)} />
}

function WizardSkeleton() {
  return (
    <div className="space-y-3 px-4 py-5">
      <div className="h-10 animate-pulse rounded-lg bg-muted" />
      <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-18 animate-pulse rounded-2xl bg-card ring-1 ring-foreground/5" />
      ))}
    </div>
  )
}
