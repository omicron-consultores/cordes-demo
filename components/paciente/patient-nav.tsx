"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, FileText, House, UserRound, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/paciente", label: "Inicio", icon: House },
  { href: "/paciente/citas", label: "Citas", icon: CalendarDays },
  { href: "/paciente/historial", label: "Historial", icon: FileText },
  { href: "/paciente/perfil", label: "Perfil", icon: UserRound },
]

/** Navegación inferior del paciente: botones grandes, ícono + texto. */
export function PatientNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Secciones del paciente"
      className="sticky bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-card/85"
    >
      <ul className="grid grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/paciente" ? pathname === href : pathname.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-14 items-center justify-center rounded-full transition-colors",
                    active && "bg-secondary",
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.25 : 2} />
                </span>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
