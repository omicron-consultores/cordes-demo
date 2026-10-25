import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"
import cordesLogo from "@/public/brand/cordes.png"
import { DemoMenu } from "@/components/layout/demo-menu"
import { getCurrentPatient } from "@/lib/session"
import { PhoneStatusBar } from "./phone-status-bar"

/**
 * Cabecera del paciente en el celular (< 640 px y en el marco de /presentacion): logo, avatar y
 * menú ⋮ con el selector de rol. En escritorio se usa la cabecera normal. En modo incrustado se
 * suma la barra de estado falsa y se quita el menú.
 */
export function PatientAppBar() {
  return (
    <div className="sticky top-0 z-40 bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/85 sm:hidden embed:block">
      <PhoneStatusBar />
      <div className="flex h-14 items-center gap-3 border-b px-4">
        <Link href="/paciente" aria-label="Inicio">
          <Image src={cordesLogo} alt="CORDES Cochabamba" priority className="h-7 w-auto" />
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <Suspense fallback={<Avatar initials="" />}>
            <PatientAvatar />
          </Suspense>
          <div className="embed:hidden">
            <DemoMenu role="paciente" />
          </div>
        </div>
      </div>
    </div>
  )
}

async function PatientAvatar() {
  const patient = await getCurrentPatient()
  // "María Elena" → "ME"
  const initials = (patient?.firstNames ?? "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
  return (
    <Link href="/paciente/perfil" aria-label={patient ? `Perfil de ${patient.name}` : "Perfil"}>
      <Avatar initials={initials} />
    </Link>
  )
}

function Avatar({ initials }: { initials: string }) {
  return (
    <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary">
      {initials}
    </span>
  )
}
