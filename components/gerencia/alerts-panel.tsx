import Link from "next/link"
import { ArrowRight, ChevronRight } from "lucide-react"
import { LOT_STATUS, STOCK_STATUS, StatusPill } from "@/components/paciente/status"
import { formatNumber, unitLabel } from "@/lib/format"
import type { Views } from "@/lib/supabase"
import { EmptyState, Panel } from "./panel"

type StockRow = Views<"v_medication_stock">
type LotRow = Views<"v_lots">

const STOCK_ORDER = ["agotado", "critico", "bajo"]
// En proyección no hay scroll: se muestran los más urgentes y el resto queda en el inventario.
const MAX_ROWS = 6

/** Medicamentos bajo mínimo y lotes vencidos o por vencer; cada fila lleva al inventario. */
export function AlertsPanel({ stock, lots }: { stock: StockRow[]; lots: LotRow[] }) {
  const stockSorted = [...stock].sort(
    (a, b) =>
      STOCK_ORDER.indexOf(a.stock_status ?? "") - STOCK_ORDER.indexOf(b.stock_status ?? "") ||
      (a.name ?? "").localeCompare(b.name ?? ""),
  )

  return (
    <Panel title="Alertas de Farmacia" subtitle="Stock e inventario que requieren acción" className="lg:row-span-2">
      <AlertGroup
        title="Medicamentos bajo mínimo"
        count={stock.length}
        href="/farmacia/inventario"
        empty="Todos los medicamentos están sobre el mínimo."
      >
        {stockSorted.slice(0, MAX_ROWS).map((m) => (
          <AlertRow
            key={m.code}
            href="/farmacia/inventario"
            title={m.name ?? ""}
            subtitle={m.concentration}
            meta={
              <>
                <strong className="font-semibold text-foreground">{formatNumber(m.available ?? 0)}</strong> / mín.{" "}
                {formatNumber(m.min_stock ?? 0)}
              </>
            }
            status={STOCK_STATUS[m.stock_status ?? "bajo"]}
          />
        ))}
      </AlertGroup>

      <AlertGroup
        title="Lotes vencidos o por vencer"
        count={lots.length}
        href="/farmacia/inventario?tab=lotes"
        empty="Ningún lote vence en los próximos 90 días."
      >
        {lots.slice(0, MAX_ROWS).map((l) => (
          <AlertRow
            key={l.id}
            href="/farmacia/inventario?tab=lotes"
            title={l.medication_name ?? ""}
            subtitle={l.concentration}
            meta={
              <>
                <strong className="font-semibold text-foreground">{expiryLabel(l.days_to_expiry ?? 0)}</strong> ·{" "}
                {formatNumber(l.quantity ?? 0)} {unitLabel(l.form ?? "unidad", l.quantity ?? 0)}
              </>
            }
            detail={`Lote ${l.lot_number}`}
            status={LOT_STATUS[l.expiry_status ?? "por_vencer"]}
          />
        ))}
      </AlertGroup>
    </Panel>
  )
}

function AlertGroup({
  title,
  count,
  href,
  empty,
  children,
}: {
  title: string
  count: number
  href: string
  empty: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="font-medium">
          {title} <span className="text-muted-foreground tabular-nums">· {formatNumber(count)}</span>
        </h3>
        {count > MAX_ROWS && (
          <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Ver {formatNumber(count - MAX_ROWS)} más
            <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
      {count === 0 ? <EmptyState>{empty}</EmptyState> : <ul className="-mx-2 divide-y">{children}</ul>}
    </div>
  )
}

function AlertRow({
  href,
  title,
  subtitle,
  meta,
  detail,
  status,
}: {
  href: string
  title: string
  subtitle: string | null
  meta: React.ReactNode
  detail?: string
  status: React.ComponentProps<typeof StatusPill>
}) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50">
        <div className="min-w-0 flex-1">
          <p className="leading-snug font-medium">
            {title} {subtitle && <span className="font-normal text-muted-foreground">{subtitle}</span>}
          </p>
          <p className="text-sm text-muted-foreground tabular-nums">{meta}</p>
          {detail && <p className="text-sm text-muted-foreground tabular-nums">{detail}</p>}
        </div>
        <StatusPill {...status} />
        <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
      </Link>
    </li>
  )
}

/** Días hasta el vencimiento (≤ 0 = vencido, vence el mismo día). */
function expiryLabel(days: number): string {
  if (days === 0) return "venció hoy"
  const n = Math.abs(days)
  const unit = n === 1 ? "día" : "días"
  return days < 0 ? `venció hace ${n} ${unit}` : `vence en ${n} ${unit}`
}
