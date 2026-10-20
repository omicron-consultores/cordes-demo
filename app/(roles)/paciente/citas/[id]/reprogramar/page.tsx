import Link from "next/link"
import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"
import { DataError } from "@/components/layout/data-error"
import { AppointmentCard } from "@/components/paciente/appointment-card"
import { RescheduleForm } from "@/components/paciente/reschedule-form"
import { buttonVariants } from "@/components/ui/button"
import { boToday, nextWorkingDays } from "@/lib/format"
import { getCurrentPatient } from "@/lib/session"
import { supabase } from "@/lib/supabase"

export default function Page({ params }: PageProps<"/paciente/citas/[id]/reprogramar">) {
  return (
    <main className="px-4 py-5">
      <div className="mb-5 flex items-center gap-2">
        <Link
          href="/paciente/citas"
          aria-label="Volver a mis citas"
          className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Cambiar fecha</h1>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
        <Reschedule params={params} />
      </Suspense>
    </main>
  )
}

async function Reschedule({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const patient = await getCurrentPatient()
  const { data: appt, error } = await supabase.from("v_appointments").select("*").eq("id", id).maybeSingle()
  if (error) return <DataError />

  // Solo citas programadas del paciente actual.
  if (!appt || appt.patient_id !== patient?.id || appt.status !== "programada") {
    return (
      <div className="space-y-4">
        <DataError message="Esta cita ya no se puede cambiar." />
        <Link href="/paciente/citas" className={buttonVariants({ variant: "outline", size: "xl", className: "w-full" })}>
          Volver a mis citas
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 font-medium text-muted-foreground">Su cita actual</h2>
        <AppointmentCard appt={appt} muted />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Elija el nuevo día y hora</h2>
        <RescheduleForm
          appointmentId={appt.id!}
          doctorId={appt.doctor_id!}
          currentAt={appt.scheduled_at!}
          days={nextWorkingDays(boToday(), 10)}
        />
      </section>
    </div>
  )
}
