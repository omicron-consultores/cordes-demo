import { OctagonX } from "lucide-react"
import { cn } from "@/lib/utils"

/** Error dentro de un formulario o diálogo, junto al campo que corresponde (mensaje de la BD tal cual). */
export function FormAlert({ message, className }: { message: string | null; className?: string }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-critical/30 bg-critical/8 px-3.5 py-3 text-sm font-medium text-critical",
        className,
      )}
    >
      <OctagonX className="mt-px size-5 shrink-0" />
      <span>{message}</span>
    </p>
  )
}
