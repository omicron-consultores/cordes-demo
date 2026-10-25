import { connection } from "next/server"
import { Suspense } from "react"
import { ActivityChart } from "@/components/gerencia/activity-chart"
import { AlertsPanel } from "@/components/gerencia/alerts-panel"
import { KpiRow, type DailyAverages } from "@/components/gerencia/kpi-row"
import { LiveStatus } from "@/components/gerencia/live-status"
import { EmptyState, Panel } from "@/components/gerencia/panel"
import { RankedBars } from "@/components/gerencia/ranked-bars"
import { CONTAINER } from "@/components/layout/container"
import { DataError } from "@/components/layout/data-error"
import { boToday, formatBs, formatNumber } from "@/lib/format"
import { supabase, type Views } from "@/lib/supabase"

const TOP_MEDICATIONS = 10
const TOP_DIAGNOSES = 8

export default function Page() {
  return (
    <main className={`${CONTAINER} flex-1 py-6 lg:py-8`}>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </main>
  )
}

async function Dashboard() {
  await connection() // KPIs y ventanas de 30 días se calculan con la fecha de hoy

  const [kpis, activity, medications, diagnoses, stock, lots] = await Promise.all([
    supabase.from("v_kpis_today").select("*").single(),
    supabase.from("v_daily_activity").select("*").order("day"),
    supabase.from("v_top_medications_30d").select("*").limit(TOP_MEDICATIONS),
    supabase.from("v_diagnoses_30d").select("*").limit(TOP_DIAGNOSES),
    supabase.from("v_medication_stock").select("*").in("stock_status", ["agotado", "critico", "bajo"]),
    supabase.from("v_lots").select("*").in("expiry_status", ["vencido", "por_vencer"]).order("expires_at"),
  ])
  if (kpis.error || activity.error || medications.error || diagnoses.error || stock.error || lots.error) {
    return <DataError />
  }

  const today = boToday()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Tablero de gerencia</h1>
        <LiveStatus today={today} />
      </div>

      <KpiRow kpis={kpis.data} averages={dailyAverages(activity.data, today)} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Actividad de los últimos 30 días" className="lg:col-span-2">
          <ActivityChart
            today={today}
            days={activity.data.map((d) => ({
              day: d.day!,
              attended: d.attended ?? 0,
              prescriptions: d.prescriptions ?? 0,
            }))}
          />
        </Panel>

        <AlertsPanel stock={stock.data} lots={lots.data} />

        <Panel title="Medicamentos más dispensados" subtitle="Top 10 · últimos 30 días · unidades y valor">
          {medications.data.length === 0 ? (
            <EmptyState>Sin dispensaciones en los últimos 30 días.</EmptyState>
          ) : (
            <RankedBars
              items={medications.data.map((m) => ({
                key: m.code!,
                title: [m.name, m.concentration].filter(Boolean).join(" "),
                label: (
                  <>
                    <span className="font-medium">{m.name}</span>{" "}
                    <span className="text-muted-foreground">{m.concentration}</span>
                  </>
                ),
                value: m.units ?? 0,
                valueLabel: `${formatNumber(m.units ?? 0)} u.`,
                detail: formatBs(m.value_bs ?? 0),
              }))}
            />
          )}
        </Panel>

        <Panel title="Diagnósticos más frecuentes" subtitle="CIE-10 · atenciones de los últimos 30 días">
          {diagnoses.data.length === 0 ? (
            <EmptyState>Sin atenciones en los últimos 30 días.</EmptyState>
          ) : (
            <RankedBars
              items={diagnoses.data.map((d) => ({
                key: d.code!,
                title: `${d.code} ${d.label}`,
                label: (
                  <>
                    <span className="mr-2 font-semibold tabular-nums">{d.code}</span>
                    {d.label}
                  </>
                ),
                value: d.encounters ?? 0,
                valueLabel: formatNumber(d.encounters ?? 0),
              }))}
            />
          )}
        </Panel>
      </div>
    </div>
  )
}

/**
 * Promedio diario de los últimos 30 días (v_daily_activity), para comparar los KPI de hoy.
 * Solo días hábiles anteriores a hoy: los fines de semana sin consulta bajarían el promedio.
 */
function dailyAverages(days: Views<"v_daily_activity">[], today: string): DailyAverages {
  const past = days.filter((d) => d.day! < today && ![0, 6].includes(new Date(`${d.day}T12:00:00Z`).getUTCDay()))
  const avg = (key: keyof DailyAverages) =>
    past.length ? Math.round(past.reduce((sum, d) => sum + (d[key] ?? 0), 0) / past.length) : undefined
  return {
    appointments: avg("appointments"),
    attended: avg("attended"),
    no_show: avg("no_show"),
    prescriptions: avg("prescriptions"),
    units_dispensed: avg("units_dispensed"),
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-16 w-96 animate-pulse rounded-lg bg-muted" />
      {[0, 1].map((row) => (
        <div key={row} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
          ))}
        </div>
      ))}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-96 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10 lg:col-span-2" />
        <div className="h-96 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
      </div>
    </div>
  )
}
