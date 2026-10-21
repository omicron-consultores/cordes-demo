import { connection } from "next/server"
import { Suspense } from "react"
import { InventoryBoard } from "@/components/farmacia/inventory-board"
import { DataError } from "@/components/layout/data-error"
import { boToday } from "@/lib/format"
import { supabase } from "@/lib/supabase"

const MOVEMENTS_LIMIT = 100

export default function Page({ searchParams }: PageProps<"/farmacia/inventario">) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
      <Suspense fallback={<InventorySkeleton />}>
        <Inventory searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Inventory({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection() // vencimientos y estados se calculan con la fecha de hoy
  const { tab } = await searchParams

  const [stock, lots, movements] = await Promise.all([
    supabase.from("v_medication_stock").select("*").order("name"),
    supabase.from("v_lots").select("*").order("expires_at"),
    // Kardex: no hay vista; se unen medicamento y lote.
    supabase
      .from("inventory_movements")
      .select("id, type, quantity, note, actor, created_at, medications(name, concentration), stock_lots(lot_number)")
      .order("created_at", { ascending: false })
      .limit(MOVEMENTS_LIMIT),
  ])
  if (stock.error || lots.error || movements.error) return <DataError />

  return (
    <InventoryBoard
      today={boToday()}
      initialTab={typeof tab === "string" ? tab : undefined}
      stock={stock.data}
      lots={lots.data}
      movements={movements.data}
    />
  )
}

function InventorySkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-12 w-80 animate-pulse rounded-lg bg-muted" />
      <div className="h-11 w-96 animate-pulse rounded-xl bg-muted" />
      <div className="h-112 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
    </div>
  )
}
