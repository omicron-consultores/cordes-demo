import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/** Select nativo con etiqueta (accesible y rápido en escritorio y tablet). */
export function SelectField({
  label,
  hideLabel = false,
  className,
  children,
  ...props
}: React.ComponentProps<"select"> & { label: string; hideLabel?: boolean }) {
  return (
    <label className={cn("grid gap-1.5 text-sm font-medium", className)}>
      <span className={cn(hideLabel && "sr-only")}>{label}</span>
      <span className="relative">
        <select
          className="h-10 w-full appearance-none rounded-lg border border-input bg-background pr-9 pl-3 text-sm font-normal outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
      </span>
    </label>
  )
}
