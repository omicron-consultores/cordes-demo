"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { CircleCheck, HeartPulse, Loader2, Pill, ShieldAlert, StickyNote, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { dispensePrescription, type DispenseResult } from "@/app/(roles)/farmacia/actions"
import { PRESCRIPTION_STATUS, PHARMACY_STATUS, StatusPill } from "@/components/paciente/status"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { age, capitalize, folioLabel, formatDateTime, unitLabel } from "@/lib/format"
import type { Tables, Views } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type Item = Views<"v_prescription_items">
type Prescription = Pick<Tables<"prescriptions">, "folio" | "status" | "notes" | "issued_at">
type Doctor = Pick<Views<"v_prescription_queue">, "doctor_name" | "specialty_name" | "establishment_name"> | null

/** Resultado de una línea tal como quedó al dispensar (se congela: la página se refresca después). */
type OutcomeLine = { item: Item; given: number; remaining: number; noStock: boolean }
type Outcome = { folio: string; status: DispenseResult["status"]; lines: OutcomeLine[] }

/**
 * Dispensación de una receta: cantidades por línea (por defecto lo pendiente) → dispense_prescription.
 * Tras dispensar muestra lo entregado y el faltante por línea; la receta parcial sigue en la bandeja.
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
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.id!, String(i.quantity_pending ?? 0)])),
  )
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [pending, startTransition] = useTransition()

  const open = prescription.status === "emitida" || prescription.status === "parcial"
  const toDispense = items.filter((i) => (i.quantity_pending ?? 0) > 0)
  const invalid = toDispense.some((i) => qtyError(quantities[i.id!], i.quantity_pending!) !== null)
  const nothing = toDispense.every((i) => Number(quantities[i.id!]) === 0)

  function dispense() {
    const snapshot = items // la página se re-renderiza con los datos nuevos al terminar
    startTransition(async () => {
      const res = await dispensePrescription(
        prescriptionId,
        toDispense.map((i) => ({ item_id: i.id!, quantity: Number(quantities[i.id!]) })),
      )
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      const result = buildOutcome(res.result, snapshot)
      setOutcome(result)
      if (result.status === "dispensada") toast.success(`Receta ${result.folio} entregada completa`)
      else toast.warning(`Receta ${result.folio} queda en bandeja`)
    })
  }

  const status = outcome?.status ?? prescription.status

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            Receta {folioLabel(prescription.folio)}
            <StatusPill {...(PHARMACY_STATUS[status] ?? PRESCRIPTION_STATUS[status])} />
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

      {outcome ? (
        <OutcomeBanner outcome={outcome} />
      ) : (
        !open && (
          <p className="rounded-xl bg-muted/60 p-4 text-muted-foreground">
            Esta receta ya está {PRESCRIPTION_STATUS[prescription.status].label.toLowerCase()}: no hay nada pendiente
            de entregar.
          </p>
        )
      )}

      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <table className="w-full text-left">
          <thead className="border-b text-sm text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Medicamento</th>
              <th className="px-3 py-3 text-right font-medium">Recetado</th>
              <th className="px-3 py-3 text-right font-medium">Ya entregado</th>
              <th className="px-3 py-3 text-right font-medium">Pendiente</th>
              <th className="px-3 py-3 text-right font-medium">Stock</th>
              <th className="px-5 py-3 text-right font-medium">{outcome ? "Resultado" : "A entregar"}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(outcome ? outcome.lines.map((l) => l.item) : items).map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                allergic={Boolean(item.allergen_group && patient.allergies.includes(item.allergen_group))}
                outcome={outcome?.lines.find((l) => l.item.id === item.id)}
                editable={open && !outcome}
                value={quantities[item.id!] ?? ""}
                onChange={(v) => setQuantities((q) => ({ ...q, [item.id!]: v }))}
                disabled={pending}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3">
        {open && !outcome ? (
          <>
            <Link href="/farmacia" className={buttonVariants({ variant: "outline", size: "xl" })}>
              Cancelar
            </Link>
            <Button size="xl" disabled={pending || invalid || nothing} onClick={dispense}>
              {pending ? <Loader2 className="animate-spin" /> : <Pill />}
              Dispensar
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
  outcome,
  editable,
  value,
  onChange,
  disabled,
}: {
  item: Item
  allergic: boolean
  outcome: OutcomeLine | undefined
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
        {outcome ? (
          <OutcomeCell line={outcome} />
        ) : pendingQty === 0 ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-ok">
            <CircleCheck className="size-4" />
            Entregado
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
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  )
}

function OutcomeCell({ line }: { line: OutcomeLine }) {
  return (
    <div className="text-sm whitespace-nowrap">
      <p className="font-semibold text-ok tabular-nums">Entregado: {line.given}</p>
      {line.remaining > 0 ? (
        <p className="font-semibold text-[#86601f] tabular-nums">
          Faltante: {line.remaining}
          {line.noStock && <span className="font-normal"> (sin stock)</span>}
        </p>
      ) : (
        <p className="text-muted-foreground">Completo</p>
      )}
    </div>
  )
}

function OutcomeBanner({ outcome }: { outcome: Outcome }) {
  if (outcome.status === "dispensada") {
    return (
      <p className="flex items-center gap-3 rounded-xl border border-ok/30 bg-ok/10 p-4 text-lg font-semibold text-ok">
        <CircleCheck className="size-6 shrink-0" />
        Receta {outcome.folio} entregada completa.
      </p>
    )
  }
  const missing = outcome.lines.filter((l) => l.remaining > 0)
  const total = missing.reduce((n, l) => n + l.remaining, 0)
  const parts = missing.map(
    (l) => `${l.remaining} ${unitLabel(l.item.form ?? "unidad", l.remaining)} de ${l.item.medication_name}`,
  )
  const given = outcome.lines.some((l) => l.given > 0)

  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/12 p-4 text-[#86601f]">
      <TriangleAlert className="mt-0.5 size-6 shrink-0" />
      <div>
        <p className="text-lg font-semibold">
          {given ? "Receta parcial" : "No se entregó ningún medicamento"}: {total === 1 ? "falta" : "faltan"}{" "}
          {joinList(parts)}. Queda en bandeja.
        </p>
        <p className="text-sm">Se podrá completar cuando ingrese stock.</p>
      </div>
    </div>
  )
}

function Num({ value, strong }: { value: number | null; strong?: boolean }) {
  return (
    <td className={cn("px-3 py-4 text-right tabular-nums", strong ? "font-semibold" : "text-muted-foreground")}>
      {value ?? 0}
    </td>
  )
}

function qtyError(value: string | undefined, max: number): string | null {
  if (value === undefined || value.trim() === "") return "Ingrese una cantidad"
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) return "Cantidad no válida"
  if (n > max) return `Máximo ${max}`
  return null
}

function buildOutcome(result: DispenseResult, items: Item[]): Outcome {
  return {
    folio: result.folio,
    status: result.status,
    lines: items.map((item) => {
      const line = result.lines.find((l) => l.item_id === item.id)
      const given = line?.dispensed ?? 0
      return {
        item,
        given,
        remaining: (item.quantity_pending ?? 0) - given,
        noStock: (line?.shortage ?? 0) > 0,
      }
    }),
  }
}

/** "Dr. X · Pediatría" (sin repetir el establecimiento si se llama igual que la especialidad). */
function doctorLine(d: NonNullable<Doctor>): string {
  return [...new Set([d.doctor_name, d.specialty_name, d.establishment_name])].filter(Boolean).join(" · ")
}

/** ["a", "b", "c"] → "a, b y c" */
function joinList(parts: string[]): string {
  return parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} y ${parts.at(-1)}`
}
