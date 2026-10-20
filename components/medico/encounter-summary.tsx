import { PRESCRIPTION_STATUS, StatusPill } from "@/components/paciente/status"
import { folioLabel } from "@/lib/format"
import type { Views } from "@/lib/supabase"

const decimal = (n: number) => String(n).replace(".", ",")

/** Atención ya cerrada: solo lectura. */
export function EncounterSummary({ encounter: e }: { encounter: Views<"v_encounters"> }) {
  const vitals = [
    e.bp_systolic !== null && { label: "Presión arterial", value: `${e.bp_systolic}/${e.bp_diastolic} mmHg` },
    e.heart_rate !== null && { label: "Frecuencia cardiaca", value: `${e.heart_rate} lpm` },
    e.temperature_c !== null && { label: "Temperatura", value: `${decimal(e.temperature_c)} °C` },
    e.weight_kg !== null && { label: "Peso", value: `${decimal(e.weight_kg)} kg` },
    e.height_cm !== null && { label: "Talla", value: `${decimal(e.height_cm)} cm` },
  ].filter((v) => v !== false)

  return (
    <section className="space-y-6 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
      <h2 className="text-lg font-semibold">Consulta registrada</h2>
      <Item label="Motivo de consulta" value={e.chief_complaint} />
      {vitals.length > 0 && (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {vitals.map((v) => (
            <div key={v.label}>
              <dt className="text-sm text-muted-foreground">{v.label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{v.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <Item label="Hallazgos" value={e.findings} />
      <Item
        label="Diagnóstico (CIE-10)"
        value={e.diagnosis_code && `${e.diagnosis_code} · ${e.diagnosis_label}`}
        extra={e.diagnosis_notes}
      />
      <Item label="Plan" value={e.plan} />
      {e.prescription_id && (
        <p className="flex items-center gap-2">
          <span className="font-semibold">Receta {folioLabel(e.prescription_folio!)}</span>
          <StatusPill {...PRESCRIPTION_STATUS[e.prescription_status!]} />
        </p>
      )}
    </section>
  )
}

function Item({ label, value, extra }: { label: string; value: string | null; extra?: string | null }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={value ? "whitespace-pre-line" : "text-muted-foreground italic"}>{value || "Sin registrar"}</p>
      {extra && <p className="text-sm text-muted-foreground">{extra}</p>}
    </div>
  )
}
