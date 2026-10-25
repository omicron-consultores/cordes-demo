import Link from "next/link"
import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"
import { DispenseView } from "@/components/farmacia/dispense-view"
import { DataError } from "@/components/layout/data-error"
import { buttonVariants } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

export default function Page({ params }: PageProps<"/farmacia/receta/[id]">) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
      <Link href="/farmacia" className={buttonVariants({ variant: "ghost", className: "-ml-3 mb-3" })}>
        <ArrowLeft />
        Volver a la bandeja
      </Link>
      <Suspense fallback={<DispenseSkeleton />}>
        <Prescription params={params} />
      </Suspense>
    </main>
  )
}

async function Prescription({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [rx, header, items] = await Promise.all([
    supabase.from("prescriptions").select("folio, status, notes, issued_at, dispensed_at, patient_id").eq("id", id).maybeSingle(),
    // La bandeja trae médico y establecimiento ya unidos (solo recetas emitidas o parciales).
    supabase
      .from("v_prescription_queue")
      .select("doctor_name, specialty_name, establishment_name")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("v_prescription_items").select("*").eq("prescription_id", id).order("line_no"),
  ])
  if (rx.error || header.error || items.error) return <DataError />
  if (!rx.data) return <DataError message="No se encontró la receta. Vuelva a la bandeja." />

  const patient = await supabase.from("patients").select("*").eq("id", rx.data.patient_id).single()
  if (patient.error) return <DataError />

  return (
    <DispenseView
      prescriptionId={id}
      prescription={rx.data}
      doctor={header.data}
      patient={patient.data}
      items={items.data}
    />
  )
}

function DispenseSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-12 w-80 animate-pulse rounded-lg bg-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
      <div className="h-80 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
    </div>
  )
}
