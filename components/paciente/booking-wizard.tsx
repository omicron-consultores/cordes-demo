"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowLeft, CalendarCheck, ChevronRight, Loader2, MapPin, Stethoscope } from "lucide-react"
import { bookAppointment } from "@/app/(roles)/paciente/actions"
import { FormAlert } from "@/components/layout/form-alert"
import { notify } from "@/components/layout/notice"
import { Button, buttonVariants } from "@/components/ui/button"
import { capitalize, formatDate, formatDateTime, formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { SlotPicker } from "./slot-picker"

export type SpecialtyOption = { code: string; name: string }
export type DoctorOption = { id: string; name: string; specialtyCode: string; place: string }

const STEP_TITLES = {
  1: "¿Qué tipo de consulta necesita?",
  2: "Elija su médico",
  3: "Elija día y hora",
  4: "Revise y confirme su cita",
} as const
type Step = keyof typeof STEP_TITLES

/** Agendar en 3 pasos (especialidad → médico y lugar → día y hora) + confirmación. */
export function BookingWizard({
  specialties,
  doctors,
  days,
}: {
  specialties: SpecialtyOption[]
  doctors: DoctorOption[]
  days: string[]
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [specialty, setSpecialty] = useState<SpecialtyOption | null>(null)
  const [doctor, setDoctor] = useState<DoctorOption | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function go(next: Step) {
    setStep(next)
    window.scrollTo({ top: 0 })
  }

  function confirm() {
    if (!doctor || !slot) return
    setError(null)
    startTransition(async () => {
      const result = await bookAppointment({ doctorId: doctor.id, scheduledAt: slot, reason })
      if (result.ok) {
        notify.success("Cita agendada", {
          description: `${capitalize(formatDateTime(slot))} · ${doctor.name}`,
          action: { label: "Ver mis citas", href: "/paciente/citas" },
        })
        router.replace("/paciente")
      } else {
        // Se muestra junto a los horarios (paso 3), que se vuelven a consultar.
        setError(result.error)
        // El cupo pudo ocuparse mientras tanto: volver a elegir con datos frescos.
        setSlot(null)
        setReloadKey((k) => k + 1)
        go(3)
      }
    })
  }

  const doctorsOfSpecialty = doctors.filter((d) => d.specialtyCode === specialty?.code)

  return (
    <div className="px-4 py-5">
      <div className="mb-5 flex items-center gap-2">
        {step === 1 ? (
          <Link
            href="/paciente/citas"
            aria-label="Volver a mis citas"
            className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
          >
            <ArrowLeft className="size-5" />
          </Link>
        ) : (
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Paso anterior"
            onClick={() => go((step - 1) as Step)}
            disabled={pending}
          >
            <ArrowLeft className="size-5" />
          </Button>
        )}
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">
            {step <= 3 ? `Paso ${step} de 3` : "Último paso"}
          </p>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5" aria-hidden>
            {[1, 2, 3].map((n) => (
              <span key={n} className={cn("h-1.5 rounded-full", n <= step ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
        </div>
      </div>

      <h1 className="mb-5 text-2xl font-semibold tracking-tight">{STEP_TITLES[step]}</h1>

      {step === 1 && (
        <ul className="space-y-2">
          {specialties.map((s) => {
            const count = doctors.filter((d) => d.specialtyCode === s.code).length
            return (
              <li key={s.code}>
                <ChoiceButton
                  onClick={() => {
                    if (s.code !== specialty?.code) setDoctor(null)
                    setSpecialty(s)
                    setSlot(null)
                    go(2)
                  }}
                  selected={s.code === specialty?.code}
                  title={s.name}
                  subtitle={count === 1 ? "1 médico" : `${count} médicos`}
                  icon={<Stethoscope className="size-5" />}
                />
              </li>
            )
          })}
        </ul>
      )}

      {step === 2 && (
        <>
          <p className="-mt-3 mb-4 text-muted-foreground">{specialty?.name}</p>
          <ul className="space-y-2">
            {doctorsOfSpecialty.map((d) => (
              <li key={d.id}>
                <ChoiceButton
                  onClick={() => {
                    if (d.id !== doctor?.id) setSlot(null)
                    setDoctor(d)
                    go(3)
                  }}
                  selected={d.id === doctor?.id}
                  title={d.name}
                  subtitle={
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5 shrink-0" />
                      {d.place}
                    </span>
                  }
                  icon={<Initials name={d.name} />}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {step === 3 && doctor && (
        <>
          <p className="-mt-3 mb-5 text-muted-foreground">
            {doctor.name} · {doctor.place}
          </p>
          <FormAlert message={error} className="mb-5" />
          <SlotPicker
            doctorId={doctor.id}
            days={days}
            value={slot}
            onChange={(s) => {
              setSlot(s)
              if (s) setError(null)
            }}
            reloadKey={reloadKey}
          />
          <Button size="xl" className="mt-6 w-full" disabled={!slot} onClick={() => go(4)}>
            {slot ? `Continuar con las ${formatTime(slot)}` : "Elija un horario"}
          </Button>
        </>
      )}

      {step === 4 && doctor && slot && specialty && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/5">
            <div className="flex items-center gap-3 text-primary">
              <CalendarCheck className="size-6" />
              <p className="font-medium">{capitalize(formatDate(slot))}</p>
            </div>
            <p className="mt-1 text-4xl font-semibold tabular-nums">{formatTime(slot)}</p>
            <dl className="mt-4 space-y-3 border-t pt-4">
              <SummaryRow label="Consulta" value={specialty.name} />
              <SummaryRow label="Médico" value={doctor.name} />
              <SummaryRow label="Lugar" value={doctor.place} />
            </dl>
          </div>

          <label className="block">
            <span className="mb-1.5 block font-medium">
              Motivo de la consulta <span className="font-normal text-muted-foreground">(opcional)</span>
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Por ejemplo: control de presión"
              className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
          </label>

          <div className="space-y-2">
            <Button size="xl" className="w-full" onClick={confirm} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {pending ? "Agendando…" : "Confirmar cita"}
            </Button>
            <Button variant="ghost" size="xl" className="w-full" onClick={() => go(3)} disabled={pending}>
              Cambiar día u hora
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ChoiceButton({
  title,
  subtitle,
  icon,
  selected,
  onClick,
}: {
  title: string
  subtitle: React.ReactNode
  icon: React.ReactNode
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-18 w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-colors hover:border-primary/60",
        selected ? "border-primary ring-1 ring-primary" : "border-border",
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}

function Initials({ name }: { name: string }) {
  const initials = name
    .replace(/^Dra?\.\s*/, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
  return <span className="text-sm font-semibold">{initials}</span>
}
