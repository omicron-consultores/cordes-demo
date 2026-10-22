import {
  CalendarDays,
  Clock,
  FileText,
  PackageCheck,
  Pill,
  Stethoscope,
  UserX,
  Wallet,
} from "lucide-react"
import type { Views } from "@/lib/supabase"
import { formatBs, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

type Kpis = Views<"v_kpis_today">

/** KPIs del día en dos filas (Consulta y Farmacia). Tono neutro: son datos, no estados. */
export function KpiRow({ kpis }: { kpis: Kpis }) {
  const n = (v: number | null) => formatNumber(v ?? 0)
  const inventory = kpis.inventory_value ?? 0

  return (
    <div className="space-y-4">
      <KpiGroup title="Consulta externa · hoy">
        <Kpi label="Citas de hoy" value={n(kpis.appointments_today)} icon={CalendarDays} />
        <Kpi label="Atendidas" value={n(kpis.attended_today)} icon={Stethoscope} />
        <Kpi label="En espera" value={n(kpis.waiting_today)} icon={Clock} />
        <Kpi label="Inasistencias" value={n(kpis.no_show_today)} icon={UserX} />
      </KpiGroup>
      <KpiGroup title="Farmacia · hoy">
        <Kpi label="Recetas emitidas" value={n(kpis.prescriptions_today)} icon={FileText} />
        <Kpi label="Recetas dispensadas" value={n(kpis.dispensed_today)} icon={PackageCheck} />
        <Kpi label="Unidades entregadas" value={n(kpis.units_dispensed_today)} icon={Pill} />
        {/* En el KPI basta el monto en bolivianos enteros; el exacto queda en el title. */}
        <Kpi
          label="Valor del inventario"
          prefix="Bs"
          value={formatNumber(Math.round(inventory))}
          title={formatBs(inventory)}
          icon={Wallet}
        />
      </KpiGroup>
    </div>
  )
}

function KpiGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">{children}</dl>
    </section>
  )
}

function Kpi({
  label,
  value,
  prefix,
  title,
  icon: Icon,
}: {
  label: string
  value: string
  prefix?: string
  title?: string
  icon: typeof Pill
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="min-w-0">
        {/* Con prefijo (montos) la cifra es más larga: un paso menos para no chocar con el ícono. */}
        <dd
          className={cn("font-semibold tracking-tight tabular-nums", prefix ? "text-4xl" : "text-4xl xl:text-5xl")}
          title={title}
        >
          {prefix && <span className="mr-1.5 text-2xl font-medium text-muted-foreground">{prefix}</span>}
          {value}
        </dd>
        <dt className="mt-1 text-base text-muted-foreground">{label}</dt>
      </div>
      <Icon className="size-7 shrink-0 text-primary/70" aria-hidden />
    </div>
  )
}
