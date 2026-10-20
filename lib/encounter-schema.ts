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
