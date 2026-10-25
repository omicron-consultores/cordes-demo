import { connection } from "next/server"
import { Suspense } from "react"
import { PrescriptionQueue } from "@/components/farmacia/prescription-queue"
import { CONTAINER } from "@/components/layout/container"
import { DataError } from "@/components/layout/data-error"
import { boToday } from "@/lib/format"
import { supabase } from "@/lib/supabase"

export default function Page() {
  return (
    <main className={`${CONTAINER} flex-1 py-6 lg:py-8`}>
      <Suspense fallback={<QueueSkeleton />}>
        <Queue />
      </Suspense>
    </main>
  )
}

async function Queue() {
  await connection() // la bandeja y los KPIs se leen por request

  const [queue, kpis] = await Promise.all([
    supabase.from("v_prescription_queue").select("*").order("issued_at"),
    supabase.from("v_kpis_today").select("dispensed_today").single(),
  ])
  if (queue.error || kpis.error) return <DataError />

  return (
    <PrescriptionQueue
      today={boToday()}
      prescriptions={queue.data}
      dispensedToday={kpis.data.dispensed_today ?? 0}
    />
  )
}

function QueueSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-12 w-80 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
    </div>
  )
}
