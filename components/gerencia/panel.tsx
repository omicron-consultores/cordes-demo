import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Bloque del tablero: título legible a distancia, acción opcional a la derecha. */
export function Panel({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn("flex flex-col gap-5 rounded-xl bg-card p-6 ring-1 ring-foreground/10", className)}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-muted/60 px-4 py-8 text-center text-muted-foreground">{children}</p>
}
