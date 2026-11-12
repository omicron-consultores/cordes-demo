import type { Json } from "./database.types"
import { formatNumber } from "./format"
import type { Views } from "./supabase"

// Exámenes del paciente (migración …05): agrupación de resultados de laboratorio, insignia y textos.

export type DiagnosticOrder = Views<"v_diagnostic_orders">
export type LabFlag = "alto" | "bajo" | "normal"
export type LabPoint = { orderId: string; at: string; value: number; flag: LabFlag }

export type Analyte = {
  code: string
  name: string
  unit: string
  low: number | null
  high: number | null
  /** Todos los valores, del más antiguo al más reciente. */
  points: LabPoint[]
}

export type LabStudy = {
  code: string
  name: string
  analytes: Analyte[]
  latestAt: string
  /** Algún analito tiene su último valor fuera de rango. */
  abnormal: boolean
}

/**
 * Agrupa los resultados por estudio y, dentro, por analito (en el orden del catálogo).
 * Primero los estudios con algo fuera de rango; luego, el resultado más reciente primero.
 */
export function groupLabResults(
  results: Views<"v_lab_results">[],
  catalog: { code: string; analytes: Json | null }[],
): LabStudy[] {
  const order = new Map(
    catalog.map((c) => [c.code, Array.isArray(c.analytes) ? c.analytes.map((a) => (a as { code: string }).code) : []]),
  )
  const sorted = [...results].sort((a, b) => a.resulted_at!.localeCompare(b.resulted_at!))

  const studies = [...Map.groupBy(sorted, (r) => r.study_code!)].map(([code, rows]): LabStudy => {
    const analytes = [...Map.groupBy(rows, (r) => r.analyte_code!)].map(([analyteCode, series]): Analyte => {
      const last = series.at(-1)!
      return {
        code: analyteCode,
        name: last.analyte_name!,
        unit: last.unit!,
        low: last.ref_low,
        high: last.ref_high,
        points: series.map((r) => ({ orderId: r.order_id!, at: r.resulted_at!, value: r.value!, flag: r.flag as LabFlag })),
      }
    })
    const rank = order.get(code) ?? []
    analytes.sort((a, b) => rank.indexOf(a.code) - rank.indexOf(b.code))
    return {
      code,
      name: rows[0].study_name!,
      analytes,
      latestAt: rows.at(-1)!.resulted_at!,
      abnormal: analytes.some((a) => a.points.at(-1)!.flag !== "normal"),
    }
  })

  return studies.sort((a, b) => Number(b.abnormal) - Number(a.abnormal) || b.latestAt.localeCompare(a.latestAt))
}

/** Insignia de la pestaña Exámenes: pendientes + estudios cuyo último resultado está fuera de rango. */
export function flaggedStudies(orders: DiagnosticOrder[], lab: LabStudy[]): number {
  return orders.filter((o) => o.status === "solicitado").length + lab.filter((s) => s.abnormal).length
}

/** Dónde vive un estudio en la pestaña Exámenes (id del elemento a resaltar desde Consultas). */
export function examTarget(o: Pick<DiagnosticOrder, "id" | "status" | "kind" | "study_code">): string {
  if (o.status === "resultado" && o.kind === "laboratorio") return `exam-study-${o.study_code}`
  return `exam-order-${o.id}`
}

/** Estado de una solicitud para chips y listas. */
export function orderStatus(status: string | null, abnormal: number | null) {
  if (status === "solicitado") return { label: "Pendiente", tone: "warning" } as const
  if ((abnormal ?? 0) > 0) return { label: "Fuera de rango", tone: "critical" } as const
  return { label: "Con resultado", tone: "ok" } as const
}

/** 70–100 · ≤ 200 · ≥ 40 */
export function formatRange(low: number | null, high: number | null): string {
  if (low !== null && high !== null) return `${formatNumber(low)}–${formatNumber(high)}`
  if (high !== null) return `≤ ${formatNumber(high)}`
  if (low !== null) return `≥ ${formatNumber(low)}`
  return "—"
}

/** Separa el informe de imagen en hallazgos y conclusión (desde "Conclusión:"). */
export function splitReport(report: string): { body: string; conclusion: string | null } {
  const i = report.indexOf("Conclusión:")
  if (i < 0) return { body: report, conclusion: null }
  return { body: report.slice(0, i).trim(), conclusion: report.slice(i).trim() }
}

/** "Dr. Jorge Andrés Villarroel Soria" → "Dr. Villarroel" (título + apellido paterno). */
export function shortDoctorName(fullName: string): string {
  const [title, ...rest] = fullName.trim().split(/\s+/)
  if (!/^Dra?\.$/.test(title) || rest.length < 2) return fullName
  return `${title} ${rest[rest.length - 2]}`
}

/** "Hemoglobina glicosilada (HbA1c)" → "HbA1c": la sigla entre paréntesis si es más corta. */
export function shortStudyName(name: string): string {
  const m = name.match(/^(.*?)\s*\(([^)]+)\)$/)
  if (!m) return name
  return m[2].length < m[1].length ? m[2] : m[1]
}
