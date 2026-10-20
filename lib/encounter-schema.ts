import { z } from "zod"

// Consulta médica (complete_encounter → p_data). Se valida en el navegador (errores por campo)
// y otra vez en la Server Action. Rangos amplios: solo atajan errores de tipeo.

const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`)
const optionalText = (max: number) => text(max).transform((v) => v || undefined)

/** Medida de un campo de formulario: vacío → sin dato; acepta coma decimal ("36,5"). */
function measure(label: string, min: number, max: number, unit: string, integer = false) {
  const range = `${label}: entre ${min} y ${max} ${unit}`
  let n = z.number({ error: `${label}: escriba solo números` }).min(min, range).max(max, range)
  if (integer) n = n.int(`${label}: sin decimales`)
  return z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v.trim().replace(",", ".")) : undefined),
    n.optional(),
  )
}

export const encounterSchema = z
  .object({
    chief_complaint: text(300).min(3, "Escriba el motivo de consulta"),
    bp_systolic: measure("Presión sistólica", 60, 260, "mmHg", true),
    bp_diastolic: measure("Presión diastólica", 30, 160, "mmHg", true),
    heart_rate: measure("Frecuencia cardiaca", 30, 220, "lpm", true),
    temperature_c: measure("Temperatura", 34, 43, "°C"),
    weight_kg: measure("Peso", 1, 300, "kg"),
    height_cm: measure("Talla", 30, 230, "cm"),
    findings: optionalText(2000),
    diagnosis_code: z.string().min(1, "Elija un diagnóstico CIE-10"),
    diagnosis_notes: optionalText(500),
    plan: text(2000).min(3, "Escriba el plan o las indicaciones"),
  })
  .superRefine((d, ctx) => {
    const sys = d.bp_systolic
    const dia = d.bp_diastolic
    if ((sys === undefined) !== (dia === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: [sys === undefined ? "bp_systolic" : "bp_diastolic"],
        message: "Registre la presión completa (sistólica y diastólica)",
      })
    } else if (sys !== undefined && dia !== undefined && sys <= dia) {
      ctx.addIssue({ code: "custom", path: ["bp_systolic"], message: "La sistólica debe ser mayor que la diastólica" })
    }
  })

export type EncounterField = keyof z.output<typeof encounterSchema>
/** Valores tal como se escriben en el formulario (texto). */
export type EncounterFormValues = Record<EncounterField, string>
export type EncounterErrors = Partial<Record<EncounterField, string>>

export const EMPTY_ENCOUNTER: EncounterFormValues = {
  chief_complaint: "",
  bp_systolic: "",
  bp_diastolic: "",
  heart_rate: "",
  temperature_c: "",
  weight_kg: "",
  height_cm: "",
  findings: "",
  diagnosis_code: "",
  diagnosis_notes: "",
  plan: "",
}

/** Primer mensaje de error por campo. */
export function fieldErrors(error: z.ZodError): EncounterErrors {
  const out: EncounterErrors = {}
  for (const issue of error.issues) {
    const field = issue.path[0] as EncounterField
    out[field] ??= issue.message
  }
  return out
}

// ---------- Receta (complete_encounter → p_items) ----------

/** Línea de receta: medicamento + dosis, frecuencia, días y cantidad a entregar. */
export const prescriptionItemSchema = z.object({
  medication_code: z.string().min(1),
  dose: text(60).min(1, "Escriba la dosis"),
  frequency: text(60).min(2, "Escriba la frecuencia"),
  duration_days: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v.trim()) : undefined),
    z
      .number({ error: "Días: escriba solo números" })
      .int("Días: sin decimales")
      .min(1, "Días: entre 1 y 365")
      .max(365, "Días: entre 1 y 365")
      .optional(),
  ),
  quantity: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v.trim()) : undefined),
    z
      .number({ error: "Escriba la cantidad a entregar" })
      .int("Cantidad: sin decimales")
      .min(1, "Cantidad: al menos 1")
      .max(999, "Cantidad: máximo 999"),
  ),
  instructions: optionalText(200),
  /** El médico confirmó recetarlo pese a la alergia del paciente (queda en las notas de la receta). */
  allergy_override: z.boolean().default(false),
})

export const prescriptionSchema = z
  .array(prescriptionItemSchema)
  .max(10, "Máximo 10 medicamentos por receta")
  .refine((items) => new Set(items.map((i) => i.medication_code)).size === items.length, {
    message: "Hay un medicamento repetido en la receta",
  })

export type PrescriptionItemField = "dose" | "frequency" | "duration_days" | "quantity" | "instructions"
/** Línea tal como se escribe en el formulario (texto). */
export type PrescriptionLineValues = Record<PrescriptionItemField, string> & {
  medication_code: string
  allergy_override: boolean
}
export type PrescriptionLineErrors = Partial<Record<PrescriptionItemField, string>>

/** Errores por línea (índice) y campo; el primero de cada campo. */
export function prescriptionErrors(error: z.ZodError): Record<number, PrescriptionLineErrors> {
  const out: Record<number, PrescriptionLineErrors> = {}
  for (const issue of error.issues) {
    const [index, field] = issue.path as [number, PrescriptionItemField]
    if (typeof index !== "number" || !field) continue
    out[index] ??= {}
    out[index][field] ??= issue.message
  }
  return out
}
