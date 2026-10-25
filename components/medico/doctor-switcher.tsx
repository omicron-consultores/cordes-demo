"use client"

import { useTransition } from "react"
import { Loader2 } from "lucide-react"
import { chooseDoctor } from "@/app/actions"
import { SelectField } from "@/components/admision/select-field"

export type DoctorChoice = { license: string; name: string; specialty: string; place: string }

/** Nombre del médico activo y selector para cambiarlo (cookie `demo_doctor_id`). */
export function DoctorSwitcher({
  current,
  name,
  subtitle,
  doctors,
}: {
  current: string
  name: string
  subtitle: string
  doctors: DoctorChoice[]
}) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {name}
          {pending && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
        </h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      <SelectField
        label="Cambiar de médico"
        className="w-full sm:w-80"
        value={current}
        disabled={pending}
        onChange={(e) => {
          const license = e.target.value
          startTransition(() => chooseDoctor(license))
        }}
      >
        {doctors.map((d) => (
          <option key={d.license} value={d.license}>
            {d.name}
          </option>
        ))}
      </SelectField>
    </div>
  )
}
