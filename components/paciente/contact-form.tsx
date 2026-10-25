"use client"

import { useState, useTransition } from "react"
import { House, Mail, Pencil, Phone, type LucideIcon } from "lucide-react"
import { updateContact } from "@/app/(roles)/paciente/actions"
import { FormAlert } from "@/components/layout/form-alert"
import { notify } from "@/components/layout/notice"
import { Button } from "@/components/ui/button"

type Contact = { phone: string | null; email: string | null; address: string | null }

const FIELDS: {
  name: keyof Contact
  label: string
  icon: LucideIcon
  type: string
  inputMode?: "tel" | "email"
  autoComplete: string
  placeholder: string
}[] = [
  { name: "phone", label: "Celular o teléfono", icon: Phone, type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "Ej. 71234567" },
  { name: "email", label: "Correo electrónico", icon: Mail, type: "email", inputMode: "email", autoComplete: "email", placeholder: "Ej. nombre@correo.com" },
  { name: "address", label: "Dirección", icon: House, type: "text", autoComplete: "street-address", placeholder: "Calle, número y zona" },
]

const inputClass =
  "h-12 w-full rounded-xl border border-input bg-background px-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

/** Datos de contacto: se ven en modo lectura y se editan con un botón grande. */
export function ContactForm({ contact }: { contact: Contact }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!editing) {
    return (
      <div className="space-y-4">
        <dl className="divide-y rounded-2xl bg-card shadow-xs ring-1 ring-foreground/5">
          {FIELDS.map(({ name, label, icon: Icon }) => (
            <div key={name} className="flex items-start gap-3 p-4">
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className={contact[name] ? "break-words" : "text-muted-foreground italic"}>
                  {contact[name] || "Sin registrar"}
                </dd>
              </div>
            </div>
          ))}
        </dl>
        <Button
          variant="outline"
          size="xl"
          className="w-full"
          onClick={() => {
            setError(null)
            setEditing(true)
          }}
        >
          <Pencil />
          Cambiar mis datos de contacto
        </Button>
      </div>
    )
  }

  function save(form: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await updateContact({
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
        address: String(form.get("address") ?? ""),
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      notify.success("Datos de contacto guardados")
      setEditing(false)
    })
  }

  return (
    <form action={save} className="space-y-4 rounded-2xl bg-card p-4 shadow-xs ring-1 ring-foreground/5">
      {FIELDS.map(({ name, label, type, inputMode, autoComplete, placeholder }) => (
        <div key={name} className="space-y-1.5">
          <label htmlFor={`contact-${name}`} className="font-medium">
            {label}
          </label>
          <input
            id={`contact-${name}`}
            name={name}
            type={type}
            inputMode={inputMode}
            autoComplete={autoComplete}
            placeholder={placeholder}
            defaultValue={contact[name] ?? ""}
            maxLength={name === "address" ? 200 : 120}
            disabled={pending}
            className={inputClass}
          />
        </div>
      ))}
      <FormAlert message={error} />
      <div className="grid gap-2 pt-1">
        <Button type="submit" size="xl" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="ghost" size="xl" disabled={pending} onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
