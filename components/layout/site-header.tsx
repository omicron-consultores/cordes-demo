import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"
import cordesLogo from "@/public/brand/cordes.png"
import type { Role } from "@/lib/roles"
import { getActorName } from "@/lib/session"
import { DemoMenu } from "./demo-menu"
import { RoleSwitcher } from "./role-switcher"

/** Sin `role` (pantalla de inicio) no muestra el selector de rol. */
export function SiteHeader({ role }: { role?: Role }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Inicio · elegir rol">
          <Image src={cordesLogo} alt="CORDES Cochabamba" priority className="h-9 w-auto" />
          <span className="hidden border-l pl-3 text-sm leading-tight text-muted-foreground lg:block">
            Caja de Salud CORDES
            <br />
            Regional Cochabamba
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5">
          {role && (
            <Suspense fallback={<RoleSwitcher role={role} actorName={null} />}>
              <CurrentRole role={role} />
            </Suspense>
          )}
          <DemoMenu />
        </div>
      </div>
    </header>
  )
}

async function CurrentRole({ role }: { role: Role }) {
  return <RoleSwitcher role={role} actorName={await getActorName(role)} />
}
