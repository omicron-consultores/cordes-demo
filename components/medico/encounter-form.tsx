"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { completeEncounter } from "@/app/(roles)/medico/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  EMPTY_ENCOUNTER,
  encounterSchema,
  fieldErrors,
  prescriptionErrors,
  prescriptionSchema,
  type EncounterErrors,
  type EncounterField,
  type EncounterFormValues,
  type PrescriptionLineErrors,
} from "@/lib/encounter-schema"
import { cn } from "@/lib/utils"
import { Cie10Picker, type Cie10Option } from "./cie10-picker"
import { medicationLabel, PrescriptionEditor, type MedicationOption, type PrescriptionLine } from "./prescription-editor"

const inputClass =
  "w-full rounded-xl border border-input bg-background px-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-critical aria-invalid:ring-3 aria-invalid:ring-critical/15"

// Orden visual: el primer campo con error recibe el foco.
const FIELD_ORDER: EncounterField[] = [
  "chief_complaint",
  "bp_systolic",
  "bp_diastolic",
  "heart_rate",
  "temperature_c",
  "weight_kg",
  "height_cm",
  "findings",
  "diagnosis_code",
  "diagnosis_notes",
  "plan",
]

const RX_FIELD_ORDER = ["dose", "frequency", "duration_days", "quantity", "instructions"] as const

/** Consulta actual: motivo, signos vitales, hallazgos, diagnóstico CIE-10, plan y receta → complete_encounter. */
export function EncounterForm({
  encounterId,
  initialComplaint,
  lastHeight,
  cie10,
  medications,
  patient,
}: {
  encounterId: string
  initialComplaint: string
  lastHeight: number | null
  cie10: Cie10Option[]
  medications: MedicationOption[]
  patient: { name: string; sex: string; allergies: string[] }
}) {
  const router = useRouter()
  const [values, setValues] = useState<EncounterFormValues>({ ...EMPTY_ENCOUNTER, chief_complaint: initialComplaint })
  const [errors, setErrors] = useState<EncounterErrors>({})
  const [lines, setLines] = useState<PrescriptionLine[]>([])
  const [rxErrors, setRxErrors] = useState<Record<number, PrescriptionLineErrors>>({})
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  function set(field: EncounterField, value: string) {
    const next = { ...values, [field]: value }
    setValues(next)
    // Un campo con error se vuelve a validar mientras se corrige.
    if (errors[field]) {
      const result = encounterSchema.safeParse(next)
      setErrors((prev) => ({ ...prev, [field]: result.success ? undefined : fieldErrors(result.error)[field] }))
    }
  }

  function changeLines(next: PrescriptionLine[]) {
    // Al quitar una línea los índices cambian: los errores se recalculan al volver a revisar.
    if (next.length < lines.length) setRxErrors({})
    else if (Object.keys(rxErrors).length) {
      const result = prescriptionSchema.safeParse(next)
      setRxErrors(result.success ? {} : prescriptionErrors(result.error))
    }
    setLines(next)
  }

  function review(e: React.FormEvent) {
    e.preventDefault()
    const result = encounterSchema.safeParse(values)
    const rx = prescriptionSchema.safeParse(lines)
    const found = result.success ? {} : fieldErrors(result.error)
    const foundRx = rx.success ? {} : prescriptionErrors(rx.error)
    setErrors(found)
    setRxErrors(foundRx)
    if (!result.success || !rx.success) {
      const firstLine = Object.keys(foundRx).map(Number).sort((a, b) => a - b)[0]
      const target =
        FIELD_ORDER.find((f) => found[f]) ??
        (firstLine !== undefined && `rx-${firstLine}-${RX_FIELD_ORDER.find((f) => foundRx[firstLine][f])}`)
      if (target) document.getElementById(target)?.focus()
      toast.error(rx.success || firstLine !== undefined ? "Revise los campos marcados en rojo." : rx.error.issues[0].message)
      return
    }
    setConfirming(true)
  }

  function finish() {
    startTransition(async () => {
      const result = await completeEncounter(encounterId, values, lines)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setConfirming(false)
      if (result.folio) {
        toast.success(`Receta ${result.folio} enviada a Farmacia`, {
          description: "La atención quedó cerrada y la cita como atendida.",
          duration: 10_000,
          action: { label: "Ver en Farmacia", onClick: () => router.push("/farmacia") },
        })
      } else {
        toast.success("Atención cerrada sin receta. La cita quedó como atendida.")
      }
      router.push("/medico")
    })
  }

  const field = (name: EncounterField) => ({
    id: name,
    value: values[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(name, e.target.value),
    "aria-invalid": Boolean(errors[name]) || undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  })
  const bmi = bodyMassIndex(values.weight_kg, values.height_cm)
  const diagnosis = cie10.find((o) => o.code === values.diagnosis_code)

  return (
    <form onSubmit={review} noValidate className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="space-y-7 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Consulta actual</h2>

        <Field label="Motivo de consulta" name="chief_complaint" error={errors.chief_complaint}>
          <textarea {...field("chief_complaint")} rows={2} maxLength={300} className={cn(inputClass, "py-2.5")} />
        </Field>

        <fieldset className="space-y-3">
          <legend className="mb-3 font-semibold">Signos vitales</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <label htmlFor="bp_systolic" className="text-sm font-medium">
                Presión arterial <span className="font-normal text-muted-foreground">(mmHg)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  {...field("bp_systolic")}
                  inputMode="numeric"
                  aria-label="Presión sistólica"
                  className={cn(inputClass, "h-11 text-center tabular-nums")}
                />
                <span className="text-lg text-muted-foreground">/</span>
                <input
                  {...field("bp_diastolic")}
                  inputMode="numeric"
                  aria-label="Presión diastólica"
                  className={cn(inputClass, "h-11 text-center tabular-nums")}
                />
              </div>
              <ErrorText name="bp_systolic" error={errors.bp_systolic} />
              <ErrorText name="bp_diastolic" error={errors.bp_diastolic} />
            </div>
            <Measure label="Frecuencia cardiaca" unit="lpm" error={errors.heart_rate} {...field("heart_rate")} />
            <Measure label="Temperatura" unit="°C" decimal error={errors.temperature_c} {...field("temperature_c")} />
            <Measure label="Peso" unit="kg" decimal error={errors.weight_kg} {...field("weight_kg")} />
            <Measure
              label="Talla"
              unit="cm"
              hint={lastHeight ? `Última registrada: ${String(lastHeight).replace(".", ",")} cm` : undefined}
              decimal
              error={errors.height_cm}
              {...field("height_cm")}
            />
            <div className="space-y-1.5">
              <p className="text-sm font-medium">
                IMC <span className="font-normal text-muted-foreground">(kg/m²)</span>
              </p>
              <p className="flex h-11 items-center rounded-xl bg-muted/60 px-3 text-base font-semibold tabular-nums">
                {bmi ?? <span className="font-normal text-muted-foreground">—</span>}
              </p>
            </div>
          </div>
        </fieldset>

        <Field
          label="Hallazgos"
          hint="Examen físico y evolución"
          name="findings"
          error={errors.findings}
          optional
        >
          <textarea {...field("findings")} rows={4} maxLength={2000} className={cn(inputClass, "py-2.5")} />
        </Field>

        <div className="space-y-3">
          <Field label="Diagnóstico (CIE-10)" name="diagnosis_code" error={errors.diagnosis_code}>
            <Cie10Picker
              options={cie10}
              value={values.diagnosis_code}
              onChange={(code) => set("diagnosis_code", code)}
              invalid={Boolean(errors.diagnosis_code)}
              describedBy={errors.diagnosis_code ? "diagnosis_code-error" : undefined}
            />
          </Field>
          <Field label="Notas del diagnóstico" name="diagnosis_notes" error={errors.diagnosis_notes} optional>
            <input {...field("diagnosis_notes")} maxLength={500} className={cn(inputClass, "h-11")} />
          </Field>
        </div>

        <Field label="Plan" hint="Indicaciones, estudios, control" name="plan" error={errors.plan}>
          <textarea {...field("plan")} rows={4} maxLength={2000} className={cn(inputClass, "py-2.5")} />
        </Field>

        <PrescriptionEditor
          medications={medications}
          lines={lines}
          errors={rxErrors}
          patient={patient}
          onChange={changeLines}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t bg-muted/30 px-5 py-4 sm:px-6">
        <Button type="submit" size="lg" disabled={pending}>
          <CheckCircle2 />
          Finalizar atención
        </Button>
      </div>

      <AlertDialog open={confirming} onOpenChange={(next) => !pending && setConfirming(next)}>
        <AlertDialogContent className="data-[size=default]:sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Finalizar la atención?</AlertDialogTitle>
            <AlertDialogDescription>
              {diagnosis && (
                <strong className="block text-foreground">
                  {diagnosis.code} · {diagnosis.label}
                </strong>
              )}
              La consulta quedará registrada en la historia clínica y la cita como atendida.{" "}
              {lines.length > 0
                ? "La receta se enviará a Farmacia."
                : "No se emitirá receta."}{" "}
              Después ya no se podrá modificar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {lines.length > 0 && (
            <ul className="space-y-1.5 rounded-xl bg-muted/60 p-3 text-sm">
              {lines.map((l) => {
                const med = medications.find((m) => m.code === l.medication_code)!
                return (
                  <li key={l.medication_code} className="flex items-start gap-2">
                    {l.allergy_override && <ShieldAlert className="mt-0.5 size-4 shrink-0 text-critical" />}
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{medicationLabel(med)}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {l.dose} {l.frequency}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">× {l.quantity}</span>
                  </li>
                )
              })}
            </ul>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Seguir editando</AlertDialogCancel>
            <AlertDialogAction onClick={finish} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Sí, finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}

function Field({
  label,
  hint,
  name,
  error,
  optional = false,
  children,
}: {
  label: string
  hint?: string
  name: EncounterField
  error?: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block font-semibold">
        {label}
        {hint && <span className="font-normal text-muted-foreground"> · {hint}</span>}
        {optional && <span className="font-normal text-muted-foreground"> (opcional)</span>}
      </label>
      {children}
      <ErrorText name={name} error={error} />
    </div>
  )
}

function Measure({
  label,
  unit,
  hint,
  decimal = false,
  error,
  ...input
}: {
  label: string
  unit: string
  hint?: string
  decimal?: boolean
  error?: string
} & React.ComponentProps<"input"> & { id: EncounterField }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={input.id} className="text-sm font-medium">
        {label} <span className="font-normal text-muted-foreground">({unit})</span>
      </label>
      <input {...input} inputMode={decimal ? "decimal" : "numeric"} className={cn(inputClass, "h-11 tabular-nums")} />
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <ErrorText name={input.id} error={error} />
    </div>
  )
}

function ErrorText({ name, error }: { name: EncounterField; error?: string }) {
  if (!error) return null
  return (
    <p id={`${name}-error`} className="text-sm font-medium text-critical">
      {error}
    </p>
  )
}

/** IMC con un decimal ("27,4") o null si falta peso o talla. */
function bodyMassIndex(weight: string, height: string): string | null {
  const w = Number(weight.replace(",", "."))
  const h = Number(height.replace(",", ".")) / 100
  if (!w || !h || h < 0.3) return null
  return (w / (h * h)).toFixed(1).replace(".", ",")
}
