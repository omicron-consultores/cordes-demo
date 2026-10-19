"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowRight, Loader2, Search, Star } from "lucide-react"
import { chooseDoctor, choosePatient } from "@/app/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ROLES, type Role } from "@/lib/roles"
import { cn } from "@/lib/utils"

export type PersonOption = { key: string; name: string; detail: string }

/** El primer elemento de cada lista es la persona recomendada para la demo. */
export function RolePicker({ patients, doctors }: { patients: PersonOption[]; doctors: PersonOption[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [target, setTarget] = useState<string | null>(null)

  // Paciente/Médico guardan la persona en su cookie; el resto de roles es solo navegar.
  function enter(role: Role, actor?: string) {
    setTarget(`${role}:${actor ?? ""}`)
    startTransition(() => {
      if (role === "paciente" && actor) return choosePatient(actor)
      if (role === "medico" && actor) return chooseDoctor(actor)
      router.push(`/${role}`)
    })
  }
  const loading = (role: Role, actor?: string) => pending && target === `${role}:${actor ?? ""}`

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      <PersonRoleCard role="paciente" people={patients} searchLabel="paciente" onEnter={enter} loading={loading} disabled={pending} />
      <PersonRoleCard role="medico" people={doctors} searchLabel="médico" onEnter={enter} loading={loading} disabled={pending} />
      {(["admision", "farmacia", "gerencia"] as const).map((role) => (
        <RoleCard key={role} role={role} className={role === "gerencia" ? "md:col-span-2" : "lg:col-span-2"}>
          <Button
            size="lg"
            variant="secondary"
            className="mt-auto h-12 w-full text-base"
            onClick={() => enter(role)}
            disabled={pending}
          >
            {loading(role) ? <Loader2 className="animate-spin" /> : null}
            Entrar como {ROLES[role].label}
            {!loading(role) && <ArrowRight />}
          </Button>
        </RoleCard>
      ))}
    </div>
  )
}

function RoleCard({
  role,
  className,
  children,
}: {
  role: Role
  className?: string
  children: React.ReactNode
}) {
  const { label, description, device, icon: Icon } = ROLES[role]
  return (
    <Card className={cn("gap-5 p-5 shadow-xs transition-shadow hover:shadow-md md:p-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="size-6" />
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          {device}
        </Badge>
      </div>
      <div>
        <h2 className="text-xl font-semibold">{label}</h2>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
      {children}
    </Card>
  )
}

function PersonRoleCard({
  role,
  people,
  searchLabel,
  onEnter,
  loading,
  disabled,
}: {
  role: "paciente" | "medico"
  people: PersonOption[]
  searchLabel: string
  onEnter: (role: Role, actor?: string) => void
  loading: (role: Role, actor?: string) => boolean
  disabled: boolean
}) {
  const [featured, ...others] = people
  const [showOthers, setShowOthers] = useState(false)
  const [query, setQuery] = useState("")

  const q = normalize(query.trim())
  const results = (q ? others.filter((p) => normalize(`${p.name} ${p.detail}`).includes(q)) : others).slice(0, 6)

  return (
    <RoleCard role={role} className="lg:col-span-3">
      {featured && (
        <button
          type="button"
          onClick={() => onEnter(role, featured.key)}
          disabled={disabled}
          className="group flex w-full items-center gap-3 rounded-xl border border-primary/25 bg-secondary/50 p-3 text-left transition-colors hover:border-primary hover:bg-secondary disabled:opacity-60"
        >
          <Initials name={featured.name} className="bg-primary text-primary-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{featured.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{featured.detail}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-highlight">
              <Star className="size-3 fill-current" /> Recomendado para la demo
            </span>
          </span>
          {loading(role, featured.key) ? (
            <Loader2 className="size-5 animate-spin text-primary" />
          ) : (
            <ArrowRight className="size-5 text-primary transition-transform group-hover:translate-x-0.5" />
          )}
        </button>
      )}

      {!showOthers ? (
        <Button variant="link" className="-mt-2 h-auto self-start px-0" onClick={() => setShowOthers(true)}>
          Elegir otro {searchLabel}
        </Button>
      ) : (
        <div className="-mt-1 space-y-2">
          <label className="relative block">
            <span className="sr-only">Buscar {searchLabel}</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={role === "paciente" ? "Nombre o matrícula" : "Nombre o especialidad"}
              className="h-11 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm"
            />
          </label>
          <ul className="max-h-64 overflow-y-auto rounded-lg border">
            {results.map((p) => (
              <li key={p.key} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => onEnter(role, p.key)}
                  disabled={disabled}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent disabled:opacity-60"
                >
                  <Initials name={p.name} className="size-8 bg-muted text-xs text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.detail}</span>
                  </span>
                  {loading(role, p.key) && <Loader2 className="size-4 animate-spin text-primary" />}
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">Sin resultados</li>
            )}
          </ul>
        </div>
      )}
    </RoleCard>
  )
}

function Initials({ name, className }: { name: string; className?: string }) {
  const initials = name
    .replace(/^Dra?\.\s*/, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
  return (
    <span
      aria-hidden
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold", className)}
    >
      {initials}
    </span>
  )
}

function normalize(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
}
