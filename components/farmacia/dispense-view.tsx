"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Ban, CircleCheck, HeartPulse, Loader2, Pill, ShieldAlert, StickyNote, TriangleAlert } from "lucide-react"
import { dispensePrescription, type DispenseResult } from "@/app/(roles)/farmacia/actions"
import { FormAlert } from "@/components/layout/form-alert"
import { notify } from "@/components/layout/notice"
import { PRESCRIPTION_STATUS, PHARMACY_STATUS, StatusPill } from "@/components/paciente/status"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { age, capitalize, folioLabel, formatDateTime } from "@/lib/format"
import type { Tables, Views } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type Item = Views<"v_prescription_items">
type Prescription = Pick<Tables<"prescriptions">, "folio" | "status" | "notes" | "issued_at" | "dispensed_at">
type Doctor = Pick<Views<"v_prescription_queue">, "doctor_name" | "specialty_name" | "establishment_name"> | null

/** Qué pasó con una línea en la última dispensación: "stock" = faltó stock, "partial" = se entregó menos a propósito. */
type LineResult = { given: number; kind: "complete" | "stock" | "partial"; message: string | null }
type Result = { folio: string; status: DispenseResult["status"]; given: number; lines: Record<string, LineResult> }

/**
 * Dispensación de una receta. El modo depende del estado ACTUAL (emitida/parcial → editable;
 * dispensada/anulada → solo lectura). El resultado de la última acción vive en el cliente; los datos
 * (ya entregado, pendiente, stock) siempre vienen del servidor tras `router.refresh()`.
 */
export function DispenseView({
  prescriptionId,
  prescription,
  doctor,
  patient,
  items,
}: {
  prescriptionId: string
  prescription: Prescription
  doctor: Doctor
  patient: Tables<"patients">
  items: Item[]
}) {
  const router = useRouter()
  const [quantities, setQuantities] = useState(() => pendingQuantities(items))
  const [prevItems, setPrevItems] = useState(items)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Llegaron datos nuevos (tras dispensar): la cantidad a entregar vuelve a ser lo pendiente.
  if (items !== prevItems) {
    setPrevItems(items)
    setQuantities(pendingQuantities(items))
  }

  const open = prescription.status === "emitida" || prescription.status === "parcial"
  const toDispense = items.filter((i) => (i.quantity_pending ?? 0) > 0)
  const invalid = toDispense.some((i) => qtyError(quantities[i.id!], i.quantity_pending!) !== null)
  const nothing = toDispense.every((i) => Number(quantities[i.id!]) === 0)

  function dispense() {
    const before = items // pendientes antes de dispensar, para explicar el resultado
    setError(null)
    startTransition(async () => {
      const res = await dispensePrescription(
        prescriptionId,
        toDispense.map((i) => ({ item_id: i.id!, quantity: Number(quantities[i.id!]) })),
      )
      if (!res.ok) {
        setError(res.error)
        return
      }
      const outcome = buildResult(res.result, before)
      setResult(outcome)
      router.refresh()
      const action = { label: "Ver inventario", href: "/farmacia/inventario" }
      if (outcome.status === "dispensada")
        notify.success("Receta dispensada", { description: `${outcome.folio} entregada completa.`, action })
      else
        notify.warning(`Receta ${outcome.folio} entregada en parte`, {
          description: "Queda en la bandeja con lo pendiente.",
          action,
        })
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            Receta {folioLabel(prescription.folio)}
            <StatusPill {...(PHARMACY_STATUS[prescription.status] ?? PRESCRIPTION_STATUS[prescription.status])} />
          </h1>
          <p className="text-muted-foreground">
            Emitida el {formatDateTime(prescription.issued_at)}
            {doctor && <> · {doctorLine(doctor)}</>}
          </p>
        </div>
      </div>

      <PatientCard patient={patient} />

      {prescription.notes && (
        <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/12 p-4 text-[#86601f]">
          <StickyNote className="mt-0.5 size-5 shrink-0" />
          <span>
            <span className="font-semibold">Nota del médico:</span> {prescription.notes}
          </span>
        </p>
      )}

      {result ? <ResultBanner result={result} /> : !open && <ClosedSummary prescription={prescription} />}

      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <table className="w-full text-left">
          <thead className="border-b text-sm text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Medicamento</th>
              <th className="px-3 py-3 text-right font-medium">Recetado</th>
              <th className="px-3 py-3 text-right font-medium">Ya entregado</th>
              <th className="px-3 py-3 text-right font-medium">Pendiente</th>
              <th className="px-3 py-3 text-right font-medium">Stock</th>
              <th className="px-5 py-3 text-right font-medium">{open ? "A entregar" : "Estado"}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                allergic={Boolean(item.allergen_group && patient.allergies.includes(item.allergen_group))}
                result={result?.lines[item.id!]}
                editable={open}
                value={quantities[item.id!] ?? ""}
                onChange={(v) => setQuantities((q) => ({ ...q, [item.id!]: v }))}
                disabled={pending}
              />
            ))}
          </tbody>
        </table>
      </div>

      <FormAlert message={error} />

      <div className="flex justify-end gap-3">
        {open ? (
          <>
            <Link href="/farmacia" className={buttonVariants({ variant: "outline", size: "xl" })}>
              {result ? "Volver a la bandeja" : "Cancelar"}
            </Link>
            <Button size="xl" disabled={pending || invalid || nothing} onClick={dispense}>
              {pending ? <Loader2 className="animate-spin" /> : <Pill />}
              {prescription.status === "parcial" ? "Entregar pendiente" : "Dispensar"}
            </Button>
          </>
        ) : (
          <Link href="/farmacia" className={buttonVariants({ size: "xl" })}>
            Volver a la bandeja
          </Link>
        )}
      </div>
    </div>
  )
}

function PatientCard({ patient }: { patient: Tables<"patients"> }) {
  return (
    <div className="grid gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10 md:grid-cols-[1fr_auto]">
      <div>
        <p className="text-lg font-semibold">
          {patient.first_names} {patient.last_names}
        </p>
        <p className="text-muted-foreground">
          <span className="tabular-nums">{patient.matricula}</span> · {age(patient.birth_date)} años ·{" "}
          {patient.sex === "F" ? "Femenino" : "Masculino"} · {capitalize(patient.insured_type)}
        </p>
        {patient.chronic_conditions.length > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#86601f]">
            <HeartPulse className="size-4" />
            {patient.chronic_conditions.map(capitalize).join(" · ")}
          </p>
        )}
      </div>
      {patient.allergies.length > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-critical/30 bg-critical/10 px-4 py-3 text-critical">
          <ShieldAlert className="mt-0.5 size-6 shrink-0" />
          <div>
            <p className="text-xs font-bold tracking-wider uppercase">Alergias</p>
            <p className="text-lg font-semibold">{patient.allergies.map(capitalize).join(", ")}</p>
          </div>
        </div>
      ) : (
        <p className="self-center rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
          Sin alergias conocidas.
        </p>
      )}
    </div>
  )
}

function ItemRow({
  item,
  allergic,
  result,
  editable,
  value,
  onChange,
  disabled,
}: {
  item: Item
  allergic: boolean
  result: LineResult | undefined
  editable: boolean
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  const pendingQty = item.quantity_pending ?? 0
  const available = item.available ?? 0
  const error = editable && pendingQty > 0 ? qtyError(value, pendingQty) : null
  const short = editable && !error && Number(value) > available

  return (
    <tr className={cn("align-top", allergic && "bg-critical/5")}>
      <td className="px-5 py-4">
        <p className="font-medium">
          {item.medication_name} <span className="font-normal text-muted-foreground">{item.concentration}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {item.form} · {item.dose}, {item.frequency}
          {item.duration_days && <> por {item.duration_days} días</>}
        </p>
        {item.instructions && <p className="text-sm text-muted-foreground italic">{item.instructions}</p>}
        {allergic && (
          <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-critical">
            <ShieldAlert className="size-4" />
            Paciente alérgico a {item.allergen_group}
          </p>
        )}
        {result?.message && <LineMessage result={result} />}
      </td>
      <Num value={item.quantity_prescribed} />
      <Num value={item.quantity_dispensed} />
      <Num value={pendingQty} strong={pendingQty > 0} />
      <td className="px-3 py-4 text-right">
        <span
          className={cn(
            "font-medium tabular-nums",
            available === 0 ? "text-critical" : available < pendingQty ? "text-[#86601f]" : "text-ok",
          )}
        >
          {available}
        </span>
      </td>
      <td className="px-5 py-4 text-right">
        {pendingQty === 0 ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-ok">
            <CircleCheck className="size-4" />
            Completo
          </span>
        ) : editable ? (
          <div className="ml-auto w-28">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={pendingQty}
              step={1}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              aria-invalid={error !== null}
              aria-label={`Cantidad a entregar de ${item.medication_name}`}
              className="h-10 text-right text-base tabular-nums"
            />
            {error ? (
              <p className="mt-1 text-xs text-critical">{error}</p>
            ) : (
              short && <p className="mt-1 text-xs text-[#86601f]">Solo hay {available} en stock</p>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">No entregado</span>
        )}
      </td>
    </tr>
  )
}

/** Explicación de la línea tras dispensar: lo entregado ahora y por qué queda pendiente. */
function LineMessage({ result }: { result: LineResult }) {
  const stock = result.kind === "stock"
  return (
    <p
      className={cn(
        "mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium",
        stock ? "bg-warning/12 text-[#86601f]" : "bg-secondary text-secondary-foreground",
      )}
    >
      {stock ? <TriangleAlert className="mt-0.5 size-4 shrink-0" /> : <Pill className="mt-0.5 size-4 shrink-0" />}
      <span>
        {result.given > 0 && <span className="tabular-nums">Entregado ahora: {result.given}. </span>}
        {result.message}
      </span>
    </p>
  )
}

function ResultBanner({ result }: { result: Result }) {
  if (result.status === "dispensada") {
    return (
      <p className="flex items-center gap-3 rounded-xl border border-ok/30 bg-ok/10 p-4 text-lg font-semibold text-ok">
        <CircleCheck className="size-6 shrink-0" />
        Receta {result.folio} entregada completa.
      </p>
    )
  }
  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/12 p-4 text-[#86601f]">
      <TriangleAlert className="mt-0.5 size-6 shrink-0" />
      <div>
        <p className="text-lg font-semibold">
          {result.given > 0
            ? `Entrega registrada. La receta ${result.folio} queda parcial en la bandeja.`
            : "No se entregó ningún medicamento."}
        </p>
        <p className="text-sm">El detalle de cada medicamento está en la tabla. Puede entregar el resto cuando corresponda.</p>
      </div>
    </div>
  )
}

/** Receta cerrada (dispensada o anulada): solo lectura. */
function ClosedSummary({ prescription }: { prescription: Prescription }) {
  if (prescription.status === "anulada") {
    return (
      <p className="flex items-center gap-3 rounded-xl bg-muted/60 p-4 text-muted-foreground">
        <Ban className="size-5 shrink-0" />
        Esta receta fue anulada: no se puede dispensar.
      </p>
    )
  }
  return (
    <p className="flex items-center gap-3 rounded-xl border border-ok/30 bg-ok/10 p-4 font-medium text-ok">
      <CircleCheck className="size-5 shrink-0" />
      Receta entregada completa
      {prescription.dispensed_at && <> el {formatDateTime(prescription.dispensed_at)}</>}. No hay nada pendiente.
    </p>
  )
}

function Num({ value, strong }: { value: number | null; strong?: boolean }) {
  return (
    <td className={cn("px-3 py-4 text-right tabular-nums", strong ? "font-semibold" : "text-muted-foreground")}>
      {value ?? 0}
    </td>
  )
}

function pendingQuantities(items: Item[]): Record<string, string> {
  return Object.fromEntries(items.map((i) => [i.id!, String(i.quantity_pending ?? 0)]))
}

function qtyError(value: string | undefined, max: number): string | null {
  if (value === undefined || value.trim() === "") return "Ingrese una cantidad"
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) return "Cantidad no válida"
  if (n > max) return `Máximo ${max}`
  return null
}

/**
 * Por línea: si se entregó menos de lo solicitado, faltó stock; si se entregó lo solicitado pero
 * queda pendiente, el farmacéutico entregó menos a propósito. N = pendiente después, X = recetado.
 */
function buildResult(result: DispenseResult, before: Item[]): Result {
  const lines: Record<string, LineResult> = {}
  for (const line of result.lines) {
    const item = before.find((i) => i.id === line.item_id)
    if (!item) continue
    const left = (item.quantity_pending ?? 0) - line.dispensed
    const total = item.quantity_prescribed ?? 0
    lines[line.item_id] =
      left <= 0
        ? { given: line.dispensed, kind: "complete", message: "Línea completa." }
        : line.shortage > 0
          ? {
              given: line.dispensed,
              kind: "stock",
              message: `Faltan ${left} de ${total} por falta de stock. Se completará cuando ingrese stock.`,
            }
          : {
              given: line.dispensed,
              kind: "partial",
              message: `Entrega parcial: quedan ${left} de ${total} pendientes de entregar.`,
            }
  }
  return {
    folio: result.folio,
    status: result.status,
    given: result.lines.reduce((n, l) => n + l.dispensed, 0),
    lines,
  }
}

/** "Dr. X · Pediatría" (sin repetir el establecimiento si se llama igual que la especialidad). */
function doctorLine(d: NonNullable<Doctor>): string {
  return [...new Set([d.doctor_name, d.specialty_name, d.establishment_name])].filter(Boolean).join(" · ")
}
