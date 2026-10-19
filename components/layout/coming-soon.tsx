import { ROLES, type Role } from "@/lib/roles"

/** Marcador temporal mientras se construye la pantalla del rol. */
export function ComingSoon({ role }: { role: Role }) {
  const { label, description, icon: Icon } = ROLES[role]
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
        <Icon className="size-7" />
      </div>
      <h1 className="text-2xl font-semibold">{label}</h1>
      <p className="max-w-md text-muted-foreground">{description}</p>
      <p className="text-sm text-muted-foreground/70">Pantalla en construcción.</p>
    </main>
  )
}
