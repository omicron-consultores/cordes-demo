import type { Database } from "@/lib/database.types"
import { cn } from "@/lib/utils"

type Enums = Database["public"]["Enums"]
type Tone = "primary" | "highlight" | "ok" | "warning" | "critical" | "muted"

const TONES: Record<Tone, string> = {
  primary: "bg-secondary text-secondary-foreground",
  highlight: "bg-highlight/12 text-[#b4500b]",
  ok: "bg-ok/10 text-ok",
  warning: "bg-warning/12 text-[#86601f]",
  critical: "bg-critical/10 text-critical",
  muted: "bg-muted text-muted-foreground",
}

// Textos pensados para el paciente: sin jerga interna.
export const APPOINTMENT_STATUS: Record<Enums["appointment_status"], { label: string; tone: Tone }> = {
  programada: { label: "Programada", tone: "primary" },
  en_atencion: { label: "En consulta", tone: "warning" },
  atendida: { label: "Atendida", tone: "ok" },
  cancelada: { label: "Cancelada", tone: "muted" },
  no_asistio: { label: "No asistió", tone: "warning" },
}

export const PRESCRIPTION_STATUS: Record<
  Enums["prescription_status"],
  { label: string; tone: Tone; hint: string }
> = {
  emitida: {
    label: "Lista para recoger",
    tone: "highlight",
    hint: "Recójala en Farmacia presentando su carnet de asegurado.",
  },
  parcial: {
    label: "Entregada en parte",
    tone: "warning",
    hint: "Falta entregarle algunos medicamentos. Farmacia le avisará cuando lleguen.",
  },
  dispensada: { label: "Entregada", tone: "ok", hint: "Ya recibió todos sus medicamentos." },
  anulada: { label: "Anulada", tone: "muted", hint: "Esta receta ya no es válida." },
}

// Stock en Farmacia (v_medication_stock.stock_status). Texto siempre junto al color.
export const STOCK_STATUS: Record<string, { label: string; tone: Tone }> = {
  ok: { label: "Disponible", tone: "ok" },
  bajo: { label: "Stock bajo", tone: "warning" },
  critico: { label: "Stock crítico", tone: "critical" },
  agotado: { label: "Agotado", tone: "critical" },
}

export function StatusPill({ label, tone, className }: { label: string; tone: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full px-3 text-sm font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {label}
    </span>
  )
}
