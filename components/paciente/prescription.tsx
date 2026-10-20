import { Pill } from "lucide-react"
import type { Database } from "@/lib/database.types"
import { formatNumber, unitLabel } from "@/lib/format"
import type { Views } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { PRESCRIPTION_STATUS, StatusPill } from "./status"

export type PrescriptionItemRow = Pick<
  Views<"v_prescription_items">,
  | "id"
  | "prescription_id"
  | "medication_name"
  | "concentration"
  | "form"
  | "dose"
  | "frequency"
  | "duration_days"
  | "instructions"
  | "quantity_prescribed"
  | "quantity_dispensed"
>

export const PRESCRIPTION_ITEM_COLUMNS =
  "id, prescription_id, medication_name, concentration, form, dose, frequency, duration_days, instructions, quantity_prescribed, quantity_dispensed"

/** Estado de la receta en lenguaje del paciente, con qué hacer a continuación. */
export function PrescriptionStatusBox({
  status,
  className,
}: {
  status: Database["public"]["Enums"]["prescription_status"]
  className?: string
}) {
  const s = PRESCRIPTION_STATUS[status]
  return (
    <div className={cn("rounded-xl bg-muted/60 p-3", className)}>
      <StatusPill {...s} className="h-8 text-base" />
      <p className="mt-1.5 text-sm text-muted-foreground">{s.hint}</p>
    </div>
  )
}

/** Medicamentos de una receta: dosis, frecuencia y cantidad (lo recibido si fue parcial). */
export function PrescriptionItems({ items, partial }: { items: PrescriptionItemRow[]; partial: boolean }) {
  return (
    <ul className="divide-y">
      {items.map((it) => {
        const prescribed = it.quantity_prescribed ?? 0
        const dispensed = it.quantity_dispensed ?? 0
        const missing = partial && dispensed < prescribed
        return (
          <li key={it.id} className="flex items-start gap-3 py-3 last:pb-0">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              <Pill className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {it.medication_name} {it.concentration}
              </p>
              <p className="text-sm text-muted-foreground">
                {it.dose}, {it.frequency}
                {it.duration_days ? `, por ${it.duration_days} ${it.duration_days === 1 ? "día" : "días"}` : ""}
              </p>
              {it.instructions && <p className="mt-0.5 text-sm text-muted-foreground italic">{it.instructions}</p>}
            </div>
            <p className="shrink-0 text-right text-sm tabular-nums">
              <span className="font-semibold">{formatNumber(prescribed)}</span>
              <span className={cn("block text-xs", missing ? "font-medium text-[#86601f]" : "text-muted-foreground")}>
                {missing ? `recibió ${formatNumber(dispensed)}` : unitLabel(it.form ?? "", prescribed)}
              </span>
            </p>
          </li>
        )
      })}
    </ul>
  )
}
