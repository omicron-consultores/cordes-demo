"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Check, ChevronDown, Loader2, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ROLES, ROLE_KEYS, type Role } from "@/lib/roles"

export function RoleSwitcher({ role, actorName }: { role: Role; actorName: string | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const current = ROLES[role]
  const Icon = pending ? Loader2 : current.icon

  function select(next: Role) {
    if (next === role) return
    // El rol es la ruta; Paciente/Médico conservan la persona elegida (cookie) o la de por defecto.
    startTransition(() => router.push(`/${next}`))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className="h-10 max-w-[60vw] gap-2 px-3" />}
        disabled={pending}
      >
        <Icon className={pending ? "animate-spin text-primary" : "text-primary"} />
        <span className="flex min-w-0 flex-col items-start leading-tight">
          <span className="font-medium">{current.label}</span>
          {actorName && (
            <span className="hidden max-w-48 truncate text-xs font-normal text-muted-foreground sm:block">
              {actorName}
            </span>
          )}
        </span>
        <ChevronDown className="text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Cambiar de rol</DropdownMenuLabel>
          {ROLE_KEYS.map((key) => {
            const r = ROLES[key]
            const RIcon = r.icon
            return (
              <DropdownMenuItem key={key} onClick={() => select(key)} className="gap-2.5 py-2">
                <RIcon className="text-primary" />
                <span className="flex-1">{r.label}</span>
                {key === role && <Check className="text-primary" />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/")} className="gap-2.5 py-2">
          <UsersRound />
          Cambiar persona…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
