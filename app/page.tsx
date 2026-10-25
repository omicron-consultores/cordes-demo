import { Suspense } from "react"
import { RolePicker, type PersonOption } from "@/components/home/role-picker"
import { CONTAINER } from "@/components/layout/container"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { age } from "@/lib/format"
import { DEFAULT_DOCTOR, DEFAULT_PATIENT } from "@/lib/roles"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className={`${CONTAINER} flex-1 py-10 md:py-14`}>
        <div className="mb-8 max-w-2xl md:mb-10">
          <p className="mb-2 text-sm font-medium text-primary">Sistema integrado de salud</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">¿Con qué rol desea ingresar?</h1>
          <p className="mt-3 text-muted-foreground md:text-lg">
            Cada acción se refleja en los demás módulos: cita, atención médica, receta digital,
            farmacia, inventario e indicadores.
          </p>
        </div>

        <Suspense fallback={<RolePickerSkeleton />}>
          <RolePickerData />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  )
}

async function RolePickerData() {
  const [patients, doctors] = await Promise.all([
    supabase
      .from("patients")
      .select("matricula, first_names, last_names, birth_date")
      .order("last_names"),
    supabase
      .from("doctors")
      .select("full_name, license_number, specialties(name), establishments(name, zone, kind)")
      .eq("active", true)
      .order("full_name"),
  ])

  if (patients.error || doctors.error) {
    return (
      <p className="rounded-lg border border-critical/30 bg-critical/5 p-4 text-critical">
        No se pudo conectar con la base de datos. Verifique que el proyecto de Supabase esté activo.
      </p>
    )
  }

  const patientOptions: PersonOption[] = patients.data.map((p) => ({
    key: p.matricula,
    name: `${p.first_names} ${p.last_names}`,
    detail: `${p.matricula} · ${age(p.birth_date)} años`,
  }))

  const doctorOptions: PersonOption[] = doctors.data.map((d) => {
    const e = d.establishments
    const place = e?.kind === "hospital" ? e.zone : e?.name
    return {
      key: d.license_number,
      name: d.full_name,
      detail: [d.specialties?.name, place].filter(Boolean).join(" · "),
    }
  })

  return (
    <RolePicker
      patients={featuredFirst(patientOptions, DEFAULT_PATIENT)}
      doctors={featuredFirst(doctorOptions, DEFAULT_DOCTOR)}
    />
  )
}

function featuredFirst(options: PersonOption[], key: string) {
  return [...options].sort((a, b) => Number(b.key === key) - Number(a.key === key))
}

function RolePickerSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-56 animate-pulse rounded-xl bg-card ring-1 ring-foreground/5",
            i < 2 ? "lg:col-span-3" : "lg:col-span-2",
            i === 4 && "md:col-span-2",
          )}
        />
      ))}
    </div>
  )
}
