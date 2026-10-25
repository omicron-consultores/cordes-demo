"use client"

import { useRouter } from "next/navigation"
import { CircleCheck, Info, OctagonX, TriangleAlert, X, type LucideIcon } from "lucide-react"
import { toast } from "sonner"

type Kind = "success" | "info" | "warning" | "error"

/** CTA del aviso: ir a una ruta (siguiente paso del flujo) o ejecutar algo. */
export type NoticeAction = { label: string; href: string } | { label: string; onClick: () => void }
export type NoticeOptions = { description?: React.ReactNode; action?: NoticeAction }

const KINDS: Record<Kind, { icon: LucideIcon; color: string }> = {
  success: { icon: CircleCheck, color: "#2c6349" },
  info: { icon: Info, color: "#0b8377" },
  warning: { icon: TriangleAlert, color: "#b07d2a" },
  error: { icon: OctagonX, color: "#96261c" },
}

function show(kind: Kind, title: string, { description, action }: NoticeOptions = {}) {
  const duration = action ? 8000 : 6000
  return toast.custom(
    (id) => <Notice id={id} kind={kind} title={title} description={description} action={action} duration={duration} />,
    { duration },
  )
}

/**
 * Avisos flotantes de la app (sobre Sonner). Éxitos con CTA al siguiente paso del flujo;
 * los errores con contexto (formularios, diálogos) van dentro del formulario con <FormAlert>.
 */
export const notify = {
  success: (title: string, options?: NoticeOptions) => show("success", title, options),
  info: (title: string, options?: NoticeOptions) => show("info", title, options),
  warning: (title: string, options?: NoticeOptions) => show("warning", title, options),
  error: (title: string, options?: NoticeOptions) => show("error", title, options),
}

function Notice({
  id,
  kind,
  title,
  description,
  action,
  duration,
}: NoticeOptions & { id: string | number; kind: Kind; title: string; duration: number }) {
  const router = useRouter()
  const { icon: Icon, color } = KINDS[kind]

  function run() {
    if (!action) return
    if ("href" in action) router.push(action.href)
    else action.onClick()
    toast.dismiss(id)
  }

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className="relative w-full overflow-hidden rounded-xl border border-l-4 bg-card text-card-foreground shadow-lg"
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-start gap-3 p-4 pr-10">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-base leading-snug font-semibold">{title}</p>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          {action && (
            <button
              type="button"
              onClick={run}
              className="mt-3 inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => toast.dismiss(id)}
        aria-label="Cerrar aviso"
        className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      {/* Tiempo restante; se pausa junto con Sonner al pasar el mouse (globals.css). */}
      <span
        aria-hidden
        className="notice-progress absolute bottom-0 left-0 h-1 w-full origin-left"
        style={{ backgroundColor: color, opacity: 0.35, animationDuration: `${duration}ms` }}
      />
    </div>
  )
}
