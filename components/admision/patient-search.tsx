"use client"

import { useEffect, useState } from "react"
import { Search, TriangleAlert, X } from "lucide-react"
import { FormAlert } from "@/components/layout/form-alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { age, capitalize } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export type PatientHit = {
  id: string
  matricula: string
  name: string
  birthDate: string
  allergies: string[]
  searchText: string
}

const MAX_RESULTS = 6
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

/**
 * Buscar paciente por nombre o matrícula, sin importar tildes ni el orden de las palabras.
 * Demo: el padrón (~130 asegurados) se carga una vez y se filtra en el navegador.
 */
export function PatientSearch({
  value,
  onChange,
}: {
  value: PatientHit | null
  onChange: (p: PatientHit | null) => void
}) {
  const [patients, setPatients] = useState<PatientHit[] | null>(null)
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    supabase
      .from("patients")
      .select("id, matricula, first_names, last_names, birth_date, allergies")
      .order("last_names")
      .then(({ data, error }) => {
        if (!active) return
        if (error) return setError("No se pudo cargar el padrón de asegurados. Revise la conexión.")
        setPatients(
          data.map((p) => {
            const name = `${p.first_names} ${p.last_names}`
            return {
              id: p.id,
              matricula: p.matricula,
              name,
              birthDate: p.birth_date,
              allergies: p.allergies,
              searchText: normalize(`${name} ${p.matricula}`),
            }
          }),
        )
      })
    return () => {
      active = false
    }
  }, [])

  if (value) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-secondary/50 p-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{value.name}</p>
          <p className="text-muted-foreground tabular-nums">
            {value.matricula} · {age(value.birthDate)} años
          </p>
          {value.allergies.length > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-critical">
              <TriangleAlert className="size-3.5" />
              Alergia a {value.allergies.map(capitalize).join(", ")}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
          <X />
          Cambiar
        </Button>
      </div>
    )
  }

  const words = normalize(query).split(/\s+/).filter(Boolean)
  const hits = words.length
    ? (patients ?? []).filter((p) => words.every((w) => p.searchText.includes(w))).slice(0, MAX_RESULTS)
    : []

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          aria-label="Buscar paciente"
          placeholder="Nombre, apellido o matrícula (ej. Quispe, 104523)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 pl-9"
        />
      </div>
      <FormAlert message={error} />
      {words.length > 0 && !error && (
        <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border" aria-label="Resultados">
          {!patients ? (
            <li className="p-3 text-muted-foreground">Buscando…</li>
          ) : hits.length === 0 ? (
            <li className="p-3 text-muted-foreground">No se encontró ningún asegurado con “{query}”.</li>
          ) : (
            hits.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onChange(p)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                  )}
                >
                  <span>
                    <span className="block font-medium">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">{age(p.birthDate)} años</span>
                  </span>
                  <span className="text-muted-foreground tabular-nums">{p.matricula}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
