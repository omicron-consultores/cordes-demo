"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Suspense } from "react"
import { Boxes, ClipboardList, type LucideIcon } from "lucide-react"
import { CONTAINER } from "@/components/layout/container"
import { cn } from "@/lib/utils"

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/farmacia", label: "Bandeja de recetas", icon: ClipboardList },
  { href: "/farmacia/inventario", label: "Inventario", icon: Boxes },
]

/** Secciones de Farmacia. La dispensación (/farmacia/receta/…) cuenta como parte de la bandeja. */
export function PharmacyNav() {
  return (
    <Suspense fallback={<NavBar pathname={null} />}>
      <ActiveNav />
    </Suspense>
  )
}

function ActiveNav() {
  return <NavBar pathname={usePathname()} />
}

function NavBar({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Secciones de Farmacia" className="border-b bg-card">
      <ul className={cn(CONTAINER, "flex gap-1")}>
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const inventory = !!pathname?.startsWith("/farmacia/inventario")
          const active = href === "/farmacia" ? pathname !== null && !inventory : inventory
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex h-12 items-center gap-2 border-b-2 px-3 font-medium transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
