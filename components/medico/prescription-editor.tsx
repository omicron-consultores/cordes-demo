"use client"

import { useId, useState } from "react"
import { Pill, Search, ShieldAlert, TriangleAlert, X } from "lucide-react"
import { STOCK_STATUS, StatusPill } from "@/components/paciente/status"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { PrescriptionItemField, PrescriptionLineErrors, PrescriptionLineValues } from "@/lib/encounter-schema"
import { formatNumber, normalizeSearch as normalize } from "@/lib/format"
import { cn } from "@/lib/utils"

export type MedicationOption = {
  code: string
  name: string
  form: string
  concentration: string | null
  available: number
  stock_status: string
  allergen_group: string | null
}

/** Línea en edición: `autoQuantity` mientras la cantidad se calcula sola (el médico no la tocó). */
export type PrescriptionLine = PrescriptionLineValues & { autoQuantity: boolean }

const MAX_RESULTS = 8
const FREQUENCIES = ["cada 6 horas", "cada 8 horas", "cada 12 horas", "cada 24 horas", "dosis única", "si hay dolor"]
// Formas que se entregan por unidad de toma: la cantidad sale de dosis × tomas al día × días.
const UNIT_FORMS: Record<string, string> = { Comprimido: "comprimido", Cápsula: "cápsula", Sobre: "sobre" }
const PACKS: Record<string, string> = { Frasco: "frascos", Tubo: "tubos", Inyectable: "unidades" }

const inputClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-critical aria-invalid:ring-3 aria-invalid:ring-critical/15"

export const medicationLabel = (m: Pick<MedicationOption, "name" | "concentration">) =>
  [m.name, m.concentration].filter(Boolean).join(" ")

/** Receta digital: buscador con stock de Farmacia, alerta bloqueante de alergia y líneas editables. */
export function PrescriptionEditor({
  medications,
  lines,
  errors,
  patient,
  onChange,
}: {
  medications: MedicationOption[]
  lines: PrescriptionLine[]
  errors: Record<number, PrescriptionLineErrors>
  patient: { name: string; sex: string; allergies: string[] }
  onChange: (lines: PrescriptionLine[]) => void
}) {
  const [pending, setPending] = useState<MedicationOption | null>(null)
  const byCode = new Map(medications.map((m) => [m.code, m]))
  const patientAllergies = patient.allergies.map(normalize)
  const allergyOf = (m: MedicationOption) =>
    m.allergen_group && patientAllergies.includes(normalize(m.allergen_group)) ? m.allergen_group : null

  function choose(m: MedicationOption) {
    if (allergyOf(m)) setPending(m)
    else add(m, false)
  }

  function add(m: MedicationOption, allergyOverride: boolean) {
    const unit = UNIT_FORMS[m.form]
    onChange([
      ...lines,
      {
        medication_code: m.code,
        dose: unit ? `1 ${unit}` : "",
        frequency: "",
        duration_days: "",
        quantity: unit ? "" : "1",
        instructions: "",
        allergy_override: allergyOverride,
        autoQuantity: Boolean(unit),
      },
    ])
    // Lleva el foco a la dosis/frecuencia de la línea nueva.
    requestAnimationFrame(() => document.getElementById(`rx-${lines.length}-${unit ? "frequency" : "dose"}`)?.focus())
  }

  function update(index: number, field: PrescriptionItemField, value: string) {
    onChange(
      lines.map((line, i) => {
        if (i !== index) return line
        const next = { ...line, [field]: value }
        if (field === "quantity") return { ...next, autoQuantity: false }
        if (next.autoQuantity) next.quantity = suggestQuantity(next) ?? next.quantity
        return next
      }),
    )
  }

  return (
    <section className="space-y-4" aria-labelledby="rx-title">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="rx-title" className="flex items-center gap-2 font-semibold">
          <Pill className="size-4 text-primary" />
          Receta
        </h3>
        {lines.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {lines.length} {lines.length === 1 ? "medicamento" : "medicamentos"}
          </span>
        )}
      </div>

      <MedicationSearch
        medications={medications}
        added={new Set(lines.map((l) => l.medication_code))}
        allergyOf={allergyOf}
        onChoose={choose}
      />

      {lines.length === 0 ? (
        <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
          Sin medicamentos. Si no receta nada, la atención se cierra sin receta.
        </p>
      ) : (
        <ol className="space-y-3">
          {lines.map((line, i) => (
            <LineEditor
              key={line.medication_code}
              index={i}
              line={line}
              med={byCode.get(line.medication_code)!}
              errors={errors[i] ?? {}}
              onUpdate={(field, value) => update(i, field, value)}
              onRemove={() => onChange(lines.filter((_, j) => j !== i))}
            />
          ))}
        </ol>
      )}

      <datalist id="rx-frequencies">
        {FREQUENCIES.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>

      {pending && (
        <AllergyDialog
          med={pending}
          group={allergyOf(pending)!}
          patient={patient}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            add(pending, true)
            setPending(null)
          }}
        />
      )}
    </section>
  )
}

function MedicationSearch({
  medications,
  added,
  allergyOf,
  onChoose,
}: {
  medications: MedicationOption[]
  added: Set<string>
  allergyOf: (m: MedicationOption) => string | null
  onChoose: (m: MedicationOption) => void
}) {
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const listId = useId()

  const q = normalize(query.trim())
  const results = q
    ? medications
        .filter((m) => normalize(m.name).includes(q) || normalize(m.code).startsWith(q))
        .slice(0, MAX_RESULTS)
    : []

  function choose(m: MedicationOption) {
    if (added.has(m.code)) return
    setQuery("")
    setActive(0)
    onChoose(m)
  }

  return (
    <div>
      <label htmlFor="rx-search" className="sr-only">
        Buscar medicamento
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id="rx-search"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (!results.length) return
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault()
              const step = e.key === "ArrowDown" ? 1 : -1
              setActive((i) => (i + step + results.length) % results.length)
            } else if (e.key === "Enter") {
              e.preventDefault()
              choose(results[active])
            }
          }}
          placeholder="Agregar medicamento: buscar por nombre o código (ej. losartán)"
          className={cn(inputClass, "pl-9")}
        />
      </div>

      {q && (
        <ul id={listId} role="listbox" className="mt-2 overflow-hidden rounded-xl border bg-card">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted-foreground">Sin resultados para “{query.trim()}”.</li>
          ) : (
            results.map((m, i) => {
              const inRx = added.has(m.code)
              const allergy = allergyOf(m)
              return (
                <li
                  key={m.code}
                  role="option"
                  aria-selected={i === active}
                  aria-disabled={inRx || undefined}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(m)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm",
                    inRx ? "cursor-default opacity-60" : "cursor-pointer",
                    i === active && !inRx && "bg-secondary",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{medicationLabel(m)}</p>
                    <p className="text-muted-foreground">
                      {m.form} · <span className="tabular-nums">{m.code}</span>
                      {inRx && " · ya está en la receta"}
                    </p>
                  </div>
                  {allergy && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-critical">
                      <ShieldAlert className="size-4" />
                      Alergia
                    </span>
                  )}
                  <StockPill med={m} />
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}

/** "Disponible · 2.708" / "Stock crítico · 2" / "Agotado", con el color de stock_status. */
function StockPill({ med }: { med: MedicationOption }) {
  const status = STOCK_STATUS[med.stock_status] ?? STOCK_STATUS.ok
  return (
    <StatusPill
      label={med.available > 0 ? `${status.label} · ${formatNumber(med.available)}` : status.label}
      tone={status.tone}
      className="h-6 px-2.5 text-xs tabular-nums"
    />
  )
}

function LineEditor({
  index,
  line,
  med,
  errors,
  onUpdate,
  onRemove,
}: {
  index: number
  line: PrescriptionLine
  med: MedicationOption
  errors: PrescriptionLineErrors
  onUpdate: (field: PrescriptionItemField, value: string) => void
  onRemove: () => void
}) {
  const field = (name: PrescriptionItemField) => {
    const id = `rx-${index}-${name}`
    return {
      id,
      value: line[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onUpdate(name, e.target.value),
      "aria-invalid": Boolean(errors[name]) || undefined,
      "aria-describedby": errors[name] ? `${id}-error` : undefined,
    }
  }
  const quantity = Number(line.quantity)
  const unit = UNIT_FORMS[med.form] ? `${UNIT_FORMS[med.form]}s` : (PACKS[med.form] ?? "unidades")

  return (
    <li
      className={cn(
        "space-y-3 rounded-xl border p-4",
        line.allergy_override ? "border-critical/40 bg-critical/5" : "bg-background",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{medicationLabel(med)}</p>
          <p className="text-sm text-muted-foreground">
            {med.form} · <span className="tabular-nums">{med.code}</span>
          </p>
        </div>
        <StockPill med={med} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={`Quitar ${med.name} de la receta`}
          className="-mt-1 -mr-2"
        >
          <X />
        </Button>
      </div>

      {line.allergy_override && (
        <p className="flex items-start gap-2 text-sm font-medium text-critical">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          Recetado pese a alergia a {med.allergen_group}. Farmacia verá la constancia en la receta.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,3fr)_minmax(0,1.5fr)_minmax(0,3fr)]">
        <LineField label="Dosis" htmlFor={`rx-${index}-dose`} error={errors.dose}>
          <input {...field("dose")} maxLength={60} className={inputClass} />
        </LineField>
        <LineField label="Frecuencia" htmlFor={`rx-${index}-frequency`} error={errors.frequency}>
          <input {...field("frequency")} list="rx-frequencies" maxLength={60} className={inputClass} />
        </LineField>
        <LineField label="Días" htmlFor={`rx-${index}-duration_days`} error={errors.duration_days}>
          <input {...field("duration_days")} inputMode="numeric" className={cn(inputClass, "tabular-nums")} />
        </LineField>
        <LineField label="Cantidad" htmlFor={`rx-${index}-quantity`} error={errors.quantity}>
          <div className="relative">
            <input
              {...field("quantity")}
              inputMode="numeric"
              className={cn(inputClass, "tabular-nums")}
              style={{ paddingRight: `calc(${unit.length}ch + 1rem)` }}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
              {unit}
            </span>
          </div>
        </LineField>
      </div>

      {quantity > med.available && (
        <p className="flex items-start gap-2 text-sm font-medium text-[#86601f]">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {med.available === 0
            ? "Farmacia no tiene stock: no podrá entregarlo por ahora."
            : `Farmacia solo tiene ${formatNumber(med.available)} ${unit}: la entrega será parcial.`}
        </p>
      )}

      <LineField label="Indicaciones" optional htmlFor={`rx-${index}-instructions`} error={errors.instructions}>
        <input {...field("instructions")} maxLength={200} className={inputClass} />
      </LineField>
    </li>
  )
}

function LineField({
  label,
  optional = false,
  htmlFor,
  error,
  children,
}: {
  label: string
  optional?: boolean
  htmlFor: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-muted-foreground"> (opcional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="text-sm font-medium text-critical">
          {error}
        </p>
      )}
    </div>
  )
}

/** Alerta bloqueante: el medicamento solo se agrega si el médico lo confirma explícitamente. */
function AllergyDialog({
  med,
  group,
  patient,
  onCancel,
  onConfirm,
}: {
  med: MedicationOption
  group: string
  patient: { name: string; sex: string }
  onCancel: () => void
  onConfirm: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)
  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="data-[size=default]:sm:max-w-md">
        <AlertDialogHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-critical/10 text-critical">
            <ShieldAlert className="size-6" />
          </div>
          <AlertDialogTitle className="text-lg font-semibold text-critical">
            {patient.name} es {patient.sex === "F" ? "alérgica" : "alérgico"} a {group}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-foreground">
            <strong>{medicationLabel(med)}</strong> pertenece a ese grupo. Recetarlo puede causar una reacción
            alérgica.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-critical/30 bg-critical/5 p-3 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-critical"
          />
          Evalué el riesgo y quiero recetarlo de todas formas.
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel autoFocus>No recetar</AlertDialogCancel>
          <Button variant="destructive" disabled={!confirmed} onClick={onConfirm}>
            Recetar igualmente
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** "1 comprimido" + "cada 8 horas" + 7 días → 21. Null si no se puede calcular. */
function suggestQuantity(line: PrescriptionLine): string | null {
  const perDose = Number(line.dose.trim().match(/^(\d+(?:[.,]\d+)?)/)?.[1]?.replace(",", "."))
  const hours = Number(line.frequency.match(/cada\s+(\d+)\s*h/i)?.[1])
  const days = Number(line.duration_days)
  if (!perDose || !hours || !days || hours > 24) return null
  return String(Math.ceil(perDose * (24 / hours) * days))
}
