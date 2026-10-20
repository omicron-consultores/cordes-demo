import { differenceInYears } from "date-fns"

// Formatos de la interfaz (es-BO). Toda fecha/hora se muestra en la zona de negocio.
export const TIME_ZONE = "America/La_Paz"
const LOCALE = "es-BO"

type DateInput = Date | string | number

/** Acepta Date, timestamp ISO o 'YYYY-MM-DD' (fecha pura, se interpreta como mediodía en Bolivia). */
function toDate(value: DateInput): Date {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00-04:00`)
  }
  return value instanceof Date ? value : new Date(value)
}

function parts(value: DateInput, options: Intl.DateTimeFormatOptions) {
  const out: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {}
  for (const p of new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, ...options }).formatToParts(
    toDate(value),
  )) {
    out[p.type] = p.value
  }
  return out
}

// ---------- Números y moneda ----------

const numberFmt = new Intl.NumberFormat(LOCALE)
const bsFmt = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 1234 → "1.234" */
export function formatNumber(n: number): string {
  return numberFmt.format(n)
}

/** 1234.5 → "Bs 1.234,50" */
export function formatBs(n: number): string {
  return `Bs ${bsFmt.format(n)}`
}

// ---------- Fechas ----------

/** "09:20" */
export function formatTime(value: DateInput): string {
  const p = parts(value, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
  return `${p.hour}:${p.minute}`
}

/** "lunes 21 de octubre" */
export function formatDate(value: DateInput): string {
  const p = parts(value, { weekday: "long", day: "numeric", month: "long" })
  return `${p.weekday} ${p.day} de ${p.month}`
}

/** "lunes 21 de octubre, 09:20" */
export function formatDateTime(value: DateInput): string {
  return `${formatDate(value)}, ${formatTime(value)}`
}

/** "21/10/2026" */
export function formatShortDate(value: DateInput): string {
  const p = parts(value, { day: "2-digit", month: "2-digit", year: "numeric" })
  return `${p.day}/${p.month}/${p.year}`
}

/** Fecha de hoy en Bolivia como 'YYYY-MM-DD' (equivale a bo_today() en SQL). */
export function boToday(): string {
  const p = parts(new Date(), { year: "numeric", month: "2-digit", day: "2-digit" })
  return `${p.year}-${p.month}-${p.day}`
}

/** Edad en años cumplidos a partir de 'YYYY-MM-DD'. */
export function age(birthDate: string): number {
  return differenceInYears(toDate(boToday()), toDate(birthDate))
}

/** { weekday: "lun", day: "21", month: "oct" } para selectores de día compactos. */
export function formatDayParts(value: DateInput): { weekday: string; day: string; month: string } {
  const p = parts(value, { weekday: "short", day: "numeric", month: "short" })
  const clean = (s = "") => s.replace(".", "")
  return { weekday: clean(p.weekday), day: p.day ?? "", month: clean(p.month) }
}

/** Próximos `count` días hábiles (lun–vie) desde `from` inclusive, como 'YYYY-MM-DD'. */
export function nextWorkingDays(from: string, count: number): string[] {
  const out: string[] = []
  const d = new Date(`${from}T12:00:00Z`)
  while (out.length < count) {
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

/** 123 → "RX-000123" */
export function folioLabel(folio: number): string {
  return `RX-${String(folio).padStart(6, "0")}`
}

/** "penicilinas" → "Penicilinas" */
export function capitalize(s: string): string {
  return s.charAt(0).toLocaleUpperCase(LOCALE) + s.slice(1)
}

/** Lugar de atención legible: "Medicina Interna · Cala Cala", "Policlínico Sacaba". */
export function placeLabel(name: string, zone: string): string {
  return name.includes(zone) ? name : `${name} · ${zone}`
}

/** ("Comprimido", 30) → "comprimidos" · ("Frasco", 1) → "frasco" */
export function unitLabel(form: string, quantity: number): string {
  const unit = form.toLocaleLowerCase(LOCALE)
  if (quantity === 1) return unit
  return /[aeiouáéíóú]$/.test(unit) ? `${unit}s` : `${unit}es`
}
