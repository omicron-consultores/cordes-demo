"use client"

import { useState, useTransition } from "react"
import { CalendarCheck, Loader2 } from "lucide-react"
import { bookAtWindow } from "@/app/(roles)/admision/actions"
import { FormAlert } from "@/components/layout/form-alert"
import { notify } from "@/components/layout/notice"
import { SlotPicker } from "@/components/paciente/slot-picker"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { formatDateTime } from "@/lib/format"
import type { DoctorOption, EstablishmentOption } from "./agenda-board"
import { PatientSearch, type PatientHit } from "./patient-search"
import { SelectField } from "./select-field"

/** Agendar por ventanilla: paciente → médico → día y horario (available_slots) → confirmar. */
export function BookDialog({
  open,
  onOpenChange,
  doctors,
  establishments,
  days,
  defaultDoctorId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctors: DoctorOption[]
  establishments: EstablishmentOption[]
  days: string[]
  defaultDoctorId: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        {/* Se monta al abrir: cada apertura empieza limpia y con el médico del filtro. */}
        {open && (
          <BookForm
            doctors={doctors}
            establishments={establishments}
            days={days}
            defaultDoctorId={defaultDoctorId}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function BookForm({
  doctors,
  establishments,
  days,
  defaultDoctorId,
  onDone,
}: {
  doctors: DoctorOption[]
  establishments: EstablishmentOption[]
  days: string[]
  defaultDoctorId: string
  onDone: () => void
}) {
  const [patient, setPatient] = useState<PatientHit | null>(null)
  const [doctorId, setDoctorId] = useState(defaultDoctorId)
  const [slot, setSlot] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const doctor = doctors.find((d) => d.id === doctorId)
  const ready = Boolean(patient && doctor && slot)

  function confirm() {
    if (!patient || !doctor || !slot) return
    setError(null)
    startTransition(async () => {
      const result = await bookAtWindow({ patientId: patient.id, doctorId: doctor.id, scheduledAt: slot, reason })
      if (result.ok) {
        notify.success("Cita agendada", {
          description: `${patient.name} · ${formatDateTime(slot)} · ${doctor.name}`,
        })
        onDone()
      } else {
        setError(result.error)
        // El cupo pudo ocuparse desde la app mientras tanto: volver a consultar.
        setSlot(null)
        setReloadKey((k) => k + 1)
      }
    })
  }

  // min-w-0: DialogContent es grid y el carrusel de días no debe ensancharlo.
  return (
    <div className="min-w-0">
      <DialogHeader className="border-b p-5">
        <DialogTitle className="text-lg">Agendar por ventanilla</DialogTitle>
        <DialogDescription>Busque al asegurado, elija médico y horario.</DialogDescription>
      </DialogHeader>

      <div className="space-y-6 p-5">
        <Step n={1} title="Paciente">
          <PatientSearch value={patient} onChange={setPatient} />
        </Step>

        <Step n={2} title="Médico">
          <SelectField
            label="Médico"
            hideLabel
            value={doctorId}
            onChange={(e) => {
              setDoctorId(e.target.value)
              setSlot(null)
              setError(null)
            }}
          >
            <option value="" disabled>
              Elija un médico…
            </option>
            {establishments.map((e) => {
              const group = doctors.filter((d) => d.establishmentCode === e.code)
              if (group.length === 0) return null
              return (
                <optgroup key={e.code} label={e.label}>
                  {group.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {d.specialty}
                    </option>
                  ))}
                </optgroup>
              )
            })}
          </SelectField>
        </Step>

        <Step n={3} title="Día y horario">
          <FormAlert message={error} />
          {doctor ? (
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
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
              Elija primero un médico.
            </p>
          )}
        </Step>

        <label className="grid gap-1.5 font-medium">
          <span>
            Motivo de la consulta <span className="font-normal text-muted-foreground">(opcional)</span>
          </span>
          <Input
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. Control de presión"
            className="h-10 font-normal"
          />
        </label>
      </div>

      <DialogFooter className="sticky bottom-0 m-0 items-center rounded-b-xl border-t bg-muted/80 p-4 backdrop-blur sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {ready ? (
            <>
              <strong className="text-foreground">{patient!.name}</strong> · {formatDateTime(slot!)}
            </>
          ) : (
            "Complete los 3 pasos para agendar."
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={onDone} disabled={pending}>
            Cancelar
          </Button>
          <Button size="lg" onClick={confirm} disabled={!ready || pending}>
            {pending ? <Loader2 className="animate-spin" /> : <CalendarCheck />}
            Agendar cita
          </Button>
        </div>
      </DialogFooter>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 font-semibold">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
          {n}
        </span>
        {title}
      </h3>
      {children}
    </section>
  )
}
