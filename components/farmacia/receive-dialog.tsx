"use client"

import { useState, useTransition } from "react"
import { Loader2, PackagePlus } from "lucide-react"
import { toast } from "sonner"
import { receiveStock } from "@/app/(roles)/farmacia/actions"
import { SelectField } from "@/components/admision/select-field"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { daysBetween, formatNumber, unitLabel } from "@/lib/format"
import type { Views } from "@/lib/supabase"

type Medication = Views<"v_medication_stock">

/** Registrar ingreso: medicamento, lote, vencimiento y cantidad → receive_stock. */
export function ReceiveDialog({
  open,
  onOpenChange,
  medications,
  today,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  medications: Medication[]
  today: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        {/* Se monta al abrir: cada apertura empieza limpia. */}
        {open && <ReceiveForm medications={medications} today={today} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ReceiveForm({
  medications,
  today,
  onDone,
}: {
  medications: Medication[]
  today: string
  onDone: () => void
}) {
  const [code, setCode] = useState("")
  const [lot, setLot] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [quantity, setQuantity] = useState("")
  const [pending, startTransition] = useTransition()

  const med = medications.find((m) => m.code === code)
  const qty = Number(quantity)
  const qtyOk = quantity !== "" && Number.isInteger(qty) && qty > 0
  const days = expiresAt ? daysBetween(today, expiresAt) : null
  const expiryOk = days !== null && days > 0
  const ready = Boolean(med && lot.trim() && expiryOk && qtyOk)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || !med) return
    startTransition(async () => {
      const result = await receiveStock({ medicationCode: med.code!, lotNumber: lot, expiresAt, quantity: qty })
      if (result.ok) {
        toast.success(`Ingreso registrado: ${formatNumber(qty)} ${unitLabel(med.form ?? "unidad", qty)}`, {
          description: `${med.name} · lote ${lot.trim()}`,
        })
        onDone()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={submit}>
      <DialogHeader className="border-b p-5">
        <DialogTitle className="text-lg">Registrar ingreso</DialogTitle>
        <DialogDescription>Mercadería recibida en Farmacia Planta Central.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 p-5">
        <div>
          <SelectField label="Medicamento" value={code} onChange={(e) => setCode(e.target.value)} required>
            <option value="" disabled>
              Elija un medicamento…
            </option>
            {medications.map((m) => (
              <option key={m.code} value={m.code!}>
                {m.name} {m.concentration} · {m.form}
              </option>
            ))}
          </SelectField>
          {med && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              Disponible hoy: <span className="font-medium text-foreground tabular-nums">{formatNumber(med.available ?? 0)}</span>{" "}
              · mínimo {formatNumber(med.min_stock ?? 0)}
            </p>
          )}
        </div>

        <label className="grid gap-1.5 text-sm font-medium">
          Número de lote
          <Input
            value={lot}
            maxLength={40}
            onChange={(e) => setLot(e.target.value)}
            placeholder="Ej. L2026-118"
            className="h-10 font-normal"
            required
          />
          <span className="text-xs font-normal text-muted-foreground">
            Si el lote ya existe para este medicamento, la cantidad se suma a su saldo.
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid content-start gap-1.5 text-sm font-medium">
            Vencimiento
            <Input
              type="date"
              value={expiresAt}
              min={nextDay(today)}
              onChange={(e) => setExpiresAt(e.target.value)}
              aria-invalid={days !== null && !expiryOk}
              className="h-10 font-normal"
              required
            />
            {days !== null && !expiryOk && (
              <span className="text-xs font-normal text-critical">Debe ser una fecha futura.</span>
            )}
            {expiryOk && days! <= 90 && (
              <span className="text-xs font-normal text-[#86601f]">Vence en {days} días: entrará como “por vencer”.</span>
            )}
          </label>

          <label className="grid content-start gap-1.5 text-sm font-medium">
            Cantidad{med?.form && <span className="font-normal text-muted-foreground"> ({unitLabel(med.form, 2)})</span>}
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              aria-invalid={quantity !== "" && !qtyOk}
              className="h-10 text-right font-normal tabular-nums"
              required
            />
            {quantity !== "" && !qtyOk && (
              <span className="text-xs font-normal text-critical">Ingrese un número entero mayor a cero.</span>
            )}
          </label>
        </div>
      </div>

      <DialogFooter className="m-0 rounded-b-xl border-t bg-muted/80 p-4">
        <Button type="button" variant="outline" size="lg" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={!ready || pending}>
          {pending ? <Loader2 className="animate-spin" /> : <PackagePlus />}
          Registrar ingreso
        </Button>
      </DialogFooter>
    </form>
  )
}

/** '2026-10-20' → '2026-10-21' */
function nextDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}
