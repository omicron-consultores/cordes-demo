"use client"

import { useState } from "react"
import { FilterX, PackagePlus, Search } from "lucide-react"
import { LOT_STATUS, MOVEMENT_TYPE, STOCK_STATUS, StatusPill } from "@/components/paciente/status"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Database } from "@/lib/database.types"
import { daysBetween, formatBs, formatDateTime, formatNumber, formatShortDate, normalizeSearch } from "@/lib/format"
import type { Views } from "@/lib/supabase"
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh"
import { cn } from "@/lib/utils"
import { ReceiveDialog } from "./receive-dialog"
import { WriteOffButton } from "./write-off-button"

type StockRow = Views<"v_medication_stock">
type LotRow = Views<"v_lots">
export type MovementRow = {
  id: string
  type: Database["public"]["Enums"]["movement_type"]
  quantity: number
  note: string | null
  actor: string | null
  created_at: string
  medications: { name: string; concentration: string | null } | null
  stock_lots: { lot_number: string } | null
}

const TABS = { stock: "Stock", lotes: "Lotes", movimientos: "Movimientos" } as const
type Tab = keyof typeof TABS
function isInventoryTab(value: unknown): value is Tab {
  return typeof value === "string" && value in TABS
}

const STOCK_FILTERS = ["ok", "bajo", "critico", "agotado"] as const
const LOT_FILTERS = ["vencido", "por_vencer", "vigente"] as const
const EXPIRY_WARN_DAYS = 90

/** Inventario de Farmacia Planta Central: stock por medicamento, lotes con semáforo y kardex, en vivo. */
export function InventoryBoard({
  today,
  initialTab,
  stock,
  lots,
  movements,
}: {
  today: string
  initialTab: string | undefined // ?tab= de la URL
  stock: StockRow[]
  lots: LotRow[]
  movements: MovementRow[]
}) {
  const [tab, setTab] = useState<Tab>(isInventoryTab(initialTab) ? initialTab : "stock")
  const [receiving, setReceiving] = useState(false)
  const [lotQuery, setLotQuery] = useState("") // "Ver lote" del aviso de ingreso lo filtra aquí
  // Toda dispensación, ingreso o baja cambia un lote (el kardex no está en Realtime, pero cambia a la vez).
  const live = useRealtimeRefresh(["stock_lots"])

  function selectTab(next: Tab) {
    setTab(next)
    // La pestaña queda en la URL (se puede enlazar) sin volver a pedir la página.
    window.history.replaceState(null, "", next === "stock" ? "?" : `?tab=${next}`)
  }

  function viewLot(lotNumber: string) {
    setLotQuery(lotNumber)
    selectTab("lotes")
  }

  const value = stock.reduce((sum, m) => sum + (m.stock_value ?? 0), 0)
  const inAlert = stock.filter((m) => m.stock_status !== "ok").length
  const expired = lots.filter((l) => l.expiry_status === "vencido").length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventario</h1>
          <p className="flex flex-wrap items-center gap-x-2 text-muted-foreground">
            Farmacia Planta Central
            <LiveDot live={live} />
          </p>
        </div>
        <dl className="flex gap-6 text-sm text-muted-foreground">
          <Stat label="Valor del inventario" value={formatBs(value)} />
          <Stat label="Medicamentos en alerta" value={formatNumber(inAlert)} tone={inAlert ? "warning" : undefined} />
          <Stat label="Lotes vencidos sin baja" value={formatNumber(expired)} tone={expired ? "critical" : undefined} />
        </dl>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Vistas del inventario" className="inline-flex rounded-xl bg-muted p-1">
          {(Object.keys(TABS) as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => selectTab(t)}
              className={cn(
                "h-9 rounded-lg px-4 font-medium transition-colors",
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {TABS[t]}
            </button>
          ))}
        </div>
        <Button size="lg" onClick={() => setReceiving(true)}>
          <PackagePlus />
          Registrar ingreso
        </Button>
      </div>

      {tab === "stock" && <StockTab stock={stock} today={today} />}
      {tab === "lotes" && <LotsTab lots={lots} query={lotQuery} onQuery={setLotQuery} />}
      {tab === "movimientos" && <MovementsTab movements={movements} />}

      <ReceiveDialog
        open={receiving}
        onOpenChange={setReceiving}
        medications={stock}
        today={today}
        onViewLot={viewLot}
      />
    </div>
  )
}

// ---------- Stock ----------

function StockTab({ stock, today }: { stock: StockRow[]; today: string }) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<string>("")

  const q = normalizeSearch(query.trim())
  const matching = stock.filter((m) => !q || normalizeSearch(`${m.code} ${m.name} ${m.concentration ?? ""}`).includes(q))
  const rows = status ? matching.filter((m) => m.stock_status === status) : matching

  return (
    <div className="space-y-4">
      <Filters
        query={query}
        onQuery={setQuery}
        placeholder="Buscar por nombre o código…"
        options={STOCK_FILTERS.map((s) => ({
          key: s,
          label: STOCK_STATUS[s].label,
          count: matching.filter((m) => m.stock_status === s).length,
        }))}
        value={status}
        onValue={setStatus}
      />
      <Table
        empty={rows.length === 0}
        head={["Código", "Medicamento", "Disponible / mínimo", "Estado", "Valor", "Próximo vencimiento"]}
        align={["", "", "", "", "right", ""]}
      >
        {rows.map((m) => {
          const days = m.next_expiry ? daysBetween(today, m.next_expiry) : null
          return (
            <tr key={m.code} className="hover:bg-muted/40">
              <td className="px-5 py-3 text-sm text-muted-foreground tabular-nums">{m.code}</td>
              <td className="px-3 py-3">
                <p className="font-medium">
                  {m.name} <span className="font-normal text-muted-foreground">{m.concentration}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {m.form}
                  {(m.expired ?? 0) > 0 && (
                    <span className="font-medium text-critical"> · {formatNumber(m.expired!)} vencidas sin baja</span>
                  )}
                </p>
              </td>
              <td className="px-3 py-3">
                <StockBar available={m.available ?? 0} min={m.min_stock ?? 0} status={m.stock_status ?? "ok"} />
              </td>
              <td className="px-3 py-3">
                <StatusPill {...STOCK_STATUS[m.stock_status ?? "ok"]} />
              </td>
              <td className="px-3 py-3 text-right tabular-nums">{formatBs(m.stock_value ?? 0)}</td>
              <td className="px-5 py-3 text-sm whitespace-nowrap tabular-nums">
                {m.next_expiry ? (
                  <>
                    <p>{formatShortDate(m.next_expiry)}</p>
                    <p className={cn(days! <= EXPIRY_WARN_DAYS ? "font-medium text-[#86601f]" : "text-muted-foreground")}>
                      {daysLabel(days!)}
                    </p>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          )
        })}
      </Table>
    </div>
  )
}

/** Barra de disponible frente al mínimo: la marca vertical es el stock mínimo (a mitad de la barra). */
function StockBar({ available, min, status }: { available: number; min: number; status: string }) {
  const scale = Math.max(min * 2, 1)
  const pct = Math.min(available / scale, 1) * 100
  const color = status === "ok" ? "bg-ok" : status === "bajo" ? "bg-warning" : "bg-critical"
  return (
    <div className="w-44">
      <p className="text-sm tabular-nums">
        <span className="font-semibold">{formatNumber(available)}</span>
        <span className="text-muted-foreground"> / mín. {formatNumber(min)}</span>
      </p>
      <div className="relative mt-1 h-1.5 rounded-full bg-muted">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
        <div className="absolute top-1/2 left-1/2 h-3 w-0.5 -translate-y-1/2 bg-foreground/40" aria-hidden />
      </div>
    </div>
  )
}

// ---------- Lotes ----------

function LotsTab({ lots, query, onQuery }: { lots: LotRow[]; query: string; onQuery: (q: string) => void }) {
  const [status, setStatus] = useState<string>("")

  const q = normalizeSearch(query.trim())
  const matching = lots.filter(
    (l) => !q || normalizeSearch(`${l.medication_code} ${l.medication_name} ${l.lot_number}`).includes(q),
  )
  const rows = status ? matching.filter((l) => l.expiry_status === status) : matching

  return (
    <div className="space-y-4">
      <Filters
        query={query}
        onQuery={onQuery}
        placeholder="Buscar por medicamento o lote…"
        options={LOT_FILTERS.map((s) => ({
          key: s,
          label: LOT_STATUS[s].label,
          count: matching.filter((l) => l.expiry_status === s).length,
        }))}
        value={status}
        onValue={setStatus}
      />
      <Table
        empty={rows.length === 0}
        head={["Medicamento", "Lote", "Cantidad", "Ingreso", "Vencimiento", "Estado", ""]}
        align={["", "", "right", "", "", "", "right"]}
      >
        {rows.map((l) => (
          <tr key={l.id} className={cn(l.expiry_status === "vencido" ? "bg-critical/5" : "hover:bg-muted/40")}>
            <td className="px-5 py-3">
              <p className="font-medium">
                {l.medication_name} <span className="font-normal text-muted-foreground">{l.concentration}</span>
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">{l.medication_code}</p>
            </td>
            <td className="px-3 py-3 tabular-nums">{l.lot_number}</td>
            <td className="px-3 py-3 text-right font-medium tabular-nums">{formatNumber(l.quantity ?? 0)}</td>
            <td className="px-3 py-3 text-sm text-muted-foreground tabular-nums">{formatShortDate(l.received_at!)}</td>
            <td className="px-3 py-3 text-sm whitespace-nowrap tabular-nums">
              <p>{formatShortDate(l.expires_at!)}</p>
              <p className={cn("font-medium", lotTone(l.expiry_status))}>{daysLabel(l.days_to_expiry ?? 0)}</p>
            </td>
            <td className="px-3 py-3">
              <StatusPill {...LOT_STATUS[l.expiry_status ?? "vigente"]} />
            </td>
            <td className="px-5 py-3 text-right">
              {l.expiry_status === "vencido" && (
                <WriteOffButton
                  lotId={l.id!}
                  summary={`${l.medication_name} · lote ${l.lot_number}`}
                  quantity={l.quantity ?? 0}
                />
              )}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  )
}

function lotTone(status: string | null): string {
  if (status === "vencido") return "text-critical"
  if (status === "por_vencer") return "text-[#86601f]"
  return "text-ok"
}

// ---------- Movimientos (kardex) ----------

function MovementsTab({ movements }: { movements: MovementRow[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Últimos {movements.length} movimientos, del más reciente al más antiguo.</p>
      <Table
        empty={movements.length === 0}
        head={["Fecha", "Tipo", "Medicamento", "Lote", "Cantidad", "Nota"]}
        align={["", "", "", "", "right", ""]}
      >
        {movements.map((m) => (
          <tr key={m.id} className="hover:bg-muted/40">
            <td className="px-5 py-3 text-sm whitespace-nowrap tabular-nums">{formatDateTime(m.created_at)}</td>
            <td className="px-3 py-3">
              <StatusPill {...MOVEMENT_TYPE[m.type]} />
            </td>
            <td className="px-3 py-3">
              <p className="font-medium">
                {m.medications?.name}{" "}
                <span className="font-normal text-muted-foreground">{m.medications?.concentration}</span>
              </p>
            </td>
            <td className="px-3 py-3 tabular-nums">{m.stock_lots?.lot_number ?? "—"}</td>
            <td
              className={cn(
                "px-3 py-3 text-right font-semibold tabular-nums",
                m.quantity > 0 ? "text-ok" : "text-foreground",
              )}
            >
              {m.quantity > 0 ? "+" : "−"}
              {formatNumber(Math.abs(m.quantity))}
            </td>
            <td className="px-5 py-3 text-sm text-muted-foreground">
              {m.note}
              {m.actor && <span className="block text-xs">{m.actor}</span>}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  )
}

// ---------- Piezas comunes ----------

function Filters({
  query,
  onQuery,
  placeholder,
  options,
  value,
  onValue,
}: {
  query: string
  onQuery: (q: string) => void
  placeholder: string
  options: { key: string; label: string; count: number }[]
  value: string
  onValue: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative w-full sm:w-80">
        <span className="sr-only">{placeholder}</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder}
          className="h-10 pl-9"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.key}
            onClick={() => onValue(value === o.key ? "" : o.key)}
            aria-pressed={value === o.key}
            className={cn(
              "h-9 rounded-full border px-3.5 text-sm font-medium transition-colors",
              value === o.key
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label} <span className="tabular-nums opacity-80">· {o.count}</span>
          </button>
        ))}
        {(value || query) && (
          <Button variant="ghost" onClick={() => (onValue(""), onQuery(""))} className="h-9 text-muted-foreground">
            <FilterX />
            Quitar filtros
          </Button>
        )}
      </div>
    </div>
  )
}

function Table({
  head,
  align,
  empty,
  children,
}: {
  head: string[]
  align: ("" | "right")[]
  empty: boolean
  children: React.ReactNode
}) {
  return (
    <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
      <table className="w-full text-left">
        <thead className="border-b text-sm text-muted-foreground">
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                className={cn(
                  "py-3 font-medium whitespace-nowrap",
                  i === 0 ? "px-5" : i === head.length - 1 ? "px-5" : "px-3",
                  align[i] === "right" && "text-right",
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {empty ? (
            <tr>
              <td colSpan={head.length} className="p-12 text-center text-muted-foreground">
                No hay resultados con estos filtros.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" | "critical" }) {
  return (
    <div className="text-right">
      <dd
        className={cn(
          "text-2xl font-semibold tabular-nums",
          tone === "critical" ? "text-critical" : tone === "warning" ? "text-[#86601f]" : "text-foreground",
        )}
      >
        {value}
      </dd>
      <dt>{label}</dt>
    </div>
  )
}

function LiveDot({ live }: { live: boolean }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-normal", live ? "text-ok" : "text-muted-foreground")}
      title={live ? "Se actualiza sola con cada ingreso, dispensación o baja" : "Conectando…"}
    >
      <span className={cn("size-2 rounded-full", live ? "animate-pulse bg-ok" : "bg-muted-foreground/50")} />
      {live ? "En vivo" : "Conectando…"}
    </span>
  )
}

/** 45 → "en 45 días" · 0 → "vence hoy" · −12 → "vencido hace 12 días" */
function daysLabel(days: number): string {
  if (days === 0) return "vence hoy"
  const n = Math.abs(days)
  const unit = n === 1 ? "día" : "días"
  return days > 0 ? `en ${n} ${unit}` : `vencido hace ${n} ${unit}`
}

