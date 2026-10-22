import type { ReactNode } from "react"

export type RankedItem = {
  key: string
  label: ReactNode
  /** Texto plano del nombre completo (title al truncar). */
  title: string
  value: number
  valueLabel: string
  detail?: string
}

/**
 * Ranking en barras horizontales hecho en HTML: los nombres largos se leen completos a distancia,
 * cada barra lleva su cifra escrita (sin depender de un tooltip) y la lista es su propia tabla accesible.
 * Un solo tono (magnitud); el color de estado no se usa aquí.
 */
export function RankedBars({ items }: { items: RankedItem[] }) {
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <ol className="space-y-3.5">
      {items.map((item, i) => (
        <li key={item.key}>
          <div className="flex items-baseline justify-between gap-3">
            {/* Se proyecta: el nombre se envuelve en vez de cortarse. */}
            <p className="flex min-w-0 gap-2 leading-snug" title={item.title}>
              <span className="w-5 shrink-0 text-right text-sm leading-6 text-muted-foreground tabular-nums">{i + 1}</span>
              <span className="min-w-0">{item.label}</span>
            </p>
            <p className="shrink-0 font-semibold tabular-nums">{item.valueLabel}</p>
          </div>
          <div className="mt-1.5 flex items-center gap-3 pl-7">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max((item.value / max) * 100, 1.5)}%` }}
              />
            </div>
            {item.detail && (
              <span className="w-28 shrink-0 text-right text-sm text-muted-foreground tabular-nums">{item.detail}</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
