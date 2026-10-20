"use client"

import { useId, useState } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { normalizeSearch as normalize } from "@/lib/format"
import { cn } from "@/lib/utils"

export type Cie10Option = { code: string; label: string }

const MAX_RESULTS = 8

/** Buscador de diagnóstico CIE-10 (código o descripción) sobre la tabla `cie10`. */
export function Cie10Picker({
  options,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  options: Cie10Option[]
  value: string
  onChange: (code: string) => void
  invalid: boolean
  describedBy?: string
}) {
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const listId = useId()
  const selected = options.find((o) => o.code === value)

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-secondary/50 px-3 py-2.5">
        <span className="rounded-md bg-primary px-2 py-0.5 text-sm font-semibold text-primary-foreground tabular-nums">
          {selected.code}
        </span>
        <span className="min-w-0 flex-1 font-medium">{selected.label}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
          <X />
          Cambiar
        </Button>
      </div>
    )
  }

  const q = normalize(query.trim())
  const results = q
    ? options.filter((o) => normalize(o.code).startsWith(q) || normalize(o.label).includes(q)).slice(0, MAX_RESULTS)
    : []

  function choose(code: string) {
    onChange(code)
    setQuery("")
    setActive(0)
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id="diagnosis_code"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (!results.length) return
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault()
              const step = e.key === "ArrowDown" ? 1 : -1
              setActive((i) => (i + step + results.length) % results.length)
            } else if (e.key === "Enter") {
              e.preventDefault()
              choose(results[active].code)
            }
          }}
          placeholder="Buscar por código o nombre (ej. I10, hipertensión)"
          className="h-11 w-full rounded-xl border border-input bg-background pr-3 pl-9 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-critical aria-invalid:ring-3 aria-invalid:ring-critical/15"
        />
      </div>

      {q && (
        <ul id={listId} role="listbox" className="mt-2 overflow-hidden rounded-xl border bg-card">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted-foreground">Sin resultados para “{query.trim()}”.</li>
          ) : (
            results.map((o, i) => (
              <li
                key={o.code}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o.code)}
                className={cn(
                  "flex cursor-pointer items-baseline gap-3 px-3 py-2.5 text-sm",
                  i === active && "bg-secondary",
                )}
              >
                <span className="w-14 shrink-0 font-semibold text-primary tabular-nums">{o.code}</span>
                {o.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
