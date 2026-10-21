"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { CircleCheck, ClipboardCheck, Pill, ShieldAlert, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { PHARMACY_STATUS, StatusPill } from "@/components/paciente/status"
import { buttonVariants } from "@/components/ui/button"
import { capitalize, folioLabel, formatDate, formatShortDate, formatTime } from "@/lib/format"
import { supabase, type Tables, type Views } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type QueueRow = Views<"v_prescription_queue">

const FRESH_MS = 10_000
// Solo se avisa de recetas recién emitidas y sueltas: "Reiniciar demo" inserta decenas de golpe.
const RECENT_MS = 2 * 60_000
const BURST_MS = 400
const BURST_MAX = 3

/** Bandeja de Farmacia: recetas emitidas y parciales por orden de llegada, en vivo. */
export function PrescriptionQueue({
  today,
  prescriptions,
  dispensedToday,
}: {
  today: string
  prescriptions: QueueRow[]
  dispensedToday: number
}) {
  const { live, fresh } = useLiveQueue()
  const partial = prescriptions.filter((p) => p.status === "parcial").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bandeja de recetas</h1>
        <p className="flex items-center gap-2 text-muted-foreground">
          {capitalize(formatDate(today))}
          <LiveDot live={live} />
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Pendientes" value={prescriptions.length} icon={Pill} />
        <Kpi label="Parciales" value={partial} icon={TriangleAlert} tone="warning" />
        <Kpi label="Dispensadas hoy" value={dispensedToday} icon={ClipboardCheck} tone="ok" />
      </dl>

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        {prescriptions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
            <ClipboardCheck className="size-7" />
            No hay recetas pendientes.
          </div>
        ) : (
          <ul className="divide-y">
            {prescriptions.map((rx) => (
              <QueueItem key={rx.id} rx={rx} today={today} fresh={fresh.has(rx.id!)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function QueueItem({ rx, today, fresh }: { rx: QueueRow; today: string; fresh: boolean }) {
  const issuedToday = formatShortDate(rx.issued_at!) === formatShortDate(today)
  const allergies = rx.allergies ?? []
  const status = PHARMACY_STATUS[rx.status!]

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 transition-colors duration-1000",
        fresh ? "bg-highlight/10" : "hover:bg-muted/40",
      )}
    >
      <div className="w-28 shrink-0">
        <p className="font-semibold tabular-nums">{rx.folio_label}</p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {issuedToday ? `Hoy ${formatTime(rx.issued_at!)}` : formatShortDate(rx.issued_at!)}
        </p>
        {fresh && (
          <span className="mt-1 block w-fit rounded-full bg-highlight px-2 py-0.5 text-[11px] font-semibold text-white">
            Nueva
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 basis-52">
        <p className="font-medium">{rx.patient_name}</p>
        <p className="text-sm text-muted-foreground tabular-nums">{rx.matricula}</p>
        {allergies.length > 0 && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-critical">
            <ShieldAlert className="size-3.5" />
            Alergia: {allergies.join(", ")}
          </p>
        )}
      </div>

      <div className="min-w-0 flex-1 basis-52">
        <p>{rx.doctor_name}</p>
        <p className="text-sm text-muted-foreground">
          {[...new Set([rx.specialty_name, rx.establishment_name])].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="w-24 shrink-0 text-sm">
        <p className="font-medium tabular-nums">
          {rx.items} {rx.items === 1 ? "ítem" : "ítems"}
        </p>
        <p className="text-muted-foreground tabular-nums">{rx.units_pending} u. pend.</p>
      </div>

      <div className="flex w-36 shrink-0 flex-col items-start gap-1.5">
        {status && <StatusPill {...status} />}
        <StockBadge ok={Boolean(rx.stock_ok)} />
      </div>

      <div className="flex w-full justify-end sm:w-auto">
        <Link href={`/farmacia/receta/${rx.id}`} className={buttonVariants({ size: "lg" })}>
          <Pill />
          Dispensar
        </Link>
      </div>
    </li>
  )
}

function StockBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-ok">
      <CircleCheck className="size-4" />
      Stock completo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-[#86601f]">
      <TriangleAlert className="size-4" />
      Falta stock
    </span>
  )
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof Pill
  tone?: "ok" | "warning"
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div>
        <dd className="text-4xl font-semibold tabular-nums">{value}</dd>
        <dt className="text-muted-foreground">{label}</dt>
      </div>
      <Icon
        className={cn(
          "size-8",
          tone === "ok" ? "text-ok" : tone === "warning" ? "text-warning" : "text-primary",
        )}
      />
    </div>
  )
}

function LiveDot({ live }: { live: boolean }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-normal", live ? "text-ok" : "text-muted-foreground")}
      title={live ? "Se actualiza sola cuando llega o se dispensa una receta" : "Conectando…"}
    >
      <span className={cn("size-2 rounded-full", live ? "animate-pulse bg-ok" : "bg-muted-foreground/50")} />
      {live ? "En vivo" : "Conectando…"}
    </span>
  )
}

/**
 * Realtime sobre `prescriptions` (llegan, se dispensan, se anulan) y `stock_lots` (cambia "Falta stock").
 * Cualquier cambio refresca la bandeja; las recetas nuevas se resaltan unos segundos y avisan con un toast.
 */
function useLiveQueue() {
  const router = useRouter()
  const [live, setLive] = useState(false)
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | undefined
    let burstTimer: ReturnType<typeof setTimeout> | undefined
    let burst: Tables<"prescriptions">[] = []

    const refresh = () => {
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => router.refresh(), 200)
    }

    const flushBurst = () => {
      const rows = burst
      burst = []
      if (rows.length > BURST_MAX) return // reinicio de la demo: solo refrescar
      for (const row of rows) {
        if (Date.now() - new Date(row.issued_at).getTime() > RECENT_MS) continue
        setFresh((s) => new Set(s).add(row.id))
        setTimeout(
          () =>
            setFresh((s) => {
              const next = new Set(s)
              next.delete(row.id)
              return next
            }),
          FRESH_MS,
        )
        notifyNew(row)
      }
    }

    const channel = supabase
      .channel("farmacia-bandeja")
      .on("postgres_changes", { event: "*", schema: "public", table: "prescriptions" }, (payload) => {
        refresh()
        if (payload.eventType !== "INSERT") return
        burst.push(payload.new as Tables<"prescriptions">)
        clearTimeout(burstTimer)
        burstTimer = setTimeout(flushBurst, BURST_MS)
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_lots" }, refresh)
      .subscribe((state) => setLive(state === "SUBSCRIBED"))

    return () => {
      clearTimeout(refreshTimer)
      clearTimeout(burstTimer)
      supabase.removeChannel(channel)
    }
  }, [router])

  return { live, fresh }
}

async function notifyNew(row: Tables<"prescriptions">) {
  const { data } = await supabase
    .from("v_prescription_queue")
    .select("patient_name, doctor_name")
    .eq("id", row.id)
    .maybeSingle()
  toast.info(`Nueva receta ${folioLabel(row.folio)}`, {
    description: data ? [data.patient_name, data.doctor_name].filter(Boolean).join(" · ") : undefined,
  })
}
