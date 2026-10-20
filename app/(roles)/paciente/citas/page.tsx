import Link from "next/link"
import { Suspense } from "react"
import { CalendarClock, CalendarPlus } from "lucide-react"
import { DataError } from "@/components/layout/data-error"
import { AppointmentCard, type AppointmentRow } from "@/components/paciente/appointment-card"
import { CancelAppointmentButton } from "@/components/paciente/cancel-appointment-button"
import { LiveRefresh } from "@/components/paciente/live-refresh"
import { buttonVariants } from "@/components/ui/button"
import { boToday, formatDateTime } from "@/lib/format"
import { getCurrentPatient } from "@/lib/session"
import { supabase } from "@/lib/supabase"

export default function Page() {
  return (
    <main className="space-y-6 px-4 py-5">
      <h1 className="text-2xl font-semibold tracking-tight">Mis citas</h1>
      <Link href="/paciente/citas/nueva" className={buttonVariants({ size: "xl", className: "w-full" })}>
        <CalendarPlus />
        Agendar nueva cita
      </Link>
      <Suspense fallback={<ListSkeleton />}>
        <AppointmentLists />
      </Suspense>
    </main>
  )
}

async function AppointmentLists() {
  const patient = await getCurrentPatient()
  if (!patient) return <DataError />

  const { data, error } = await supabase
    .from("v_appointments")
    .select("*")
    .eq("patient_id", patient.id)
    .order("scheduled_at", { ascending: false })
  if (error) return <DataError />

  const today = boToday()
  const isUpcoming = (a: AppointmentRow) =>
    (a.status === "programada" || a.status === "en_atencion") && a.local_date! >= today
  const upcoming = data.filter(isUpcoming).reverse()
  const past = data.filter((a) => !isUpcoming(a)).slice(0, 20)

  return (
    <>
      <LiveRefresh patientId={patient.id} />

      <section aria-labelledby="proximas" className="space-y-3">
        <h2 id="proximas" className="text-lg font-semibold">
          Próximas
        </h2>
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
            <CalendarClock className="size-7" />
            No tiene citas programadas.
          </div>
        ) : (
          upcoming.map((a) => (
            <AppointmentCard
              key={a.id}
              appt={a}
              actions={
                a.status === "programada" && (
                  <>
                    <Link
                      href={`/paciente/citas/${a.id}/reprogramar`}
                      className={buttonVariants({ variant: "outline", size: "xl" })}
                    >
                      Cambiar fecha
                    </Link>
                    <CancelAppointmentButton appointmentId={a.id!} when={formatDateTime(a.scheduled_at!)} />
                  </>
                )
              }
            />
          ))
        )}
      </section>

      {past.length > 0 && (
        <section aria-labelledby="anteriores" className="space-y-3">
          <h2 id="anteriores" className="text-lg font-semibold">
            Anteriores
          </h2>
          {past.map((a) => (
            <AppointmentCard key={a.id} appt={a} muted />
          ))}
        </section>
      )}
    </>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-6 w-24 animate-pulse rounded bg-muted" />
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="h-44 animate-pulse rounded-2xl bg-card ring-1 ring-foreground/5" />
      ))}
    </div>
  )
}
