import { Suspense } from "react"
import { HeartPulse, TriangleAlert } from "lucide-react"
import { DataError } from "@/components/layout/data-error"
import { ContactForm } from "@/components/paciente/contact-form"
import { age, capitalize, formatShortDate, placeLabel } from "@/lib/format"
import { getCurrentPatient } from "@/lib/session"
import { supabase } from "@/lib/supabase"

const SEX: Record<string, string> = { F: "Femenino", M: "Masculino" }

export default function Page() {
  return (
    <main className="space-y-6 px-4 py-5">
      <h1 className="text-2xl font-semibold tracking-tight">Mi perfil</h1>
      <Suspense fallback={<ProfileSkeleton />}>
        <Profile />
      </Suspense>
    </main>
  )
}

async function Profile() {
  const current = await getCurrentPatient()
  if (!current) return <DataError />

  const { data: p, error } = await supabase
    .from("patients")
    .select("*, establishments(name, zone)")
    .eq("id", current.id)
    .single()
  if (error) return <DataError />

  const initials = `${p.first_names[0]}${p.last_names[0]}`
  const home = p.establishments

  const personal: [string, React.ReactNode][] = [
    [
      "Nacimiento",
      <>
        {formatShortDate(p.birth_date)}
        <span className="block text-sm font-normal text-muted-foreground">{age(p.birth_date)} años</span>
      </>,
    ],
    ["Sexo", SEX[p.sex] ?? p.sex],
    ["Grupo sanguíneo", p.blood_type ?? "Sin registrar"],
    ["Tipo de asegurado", capitalize(p.insured_type)],
    ["Sector", p.affiliation_sector],
    ["Centro de salud", home ? placeLabel(home.name, home.zone) : "Sin asignar"],
  ]

  return (
    <>
      <section className="flex items-center gap-4">
        <span
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground"
          aria-hidden
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="text-lg leading-tight font-semibold">
            {p.first_names} {p.last_names}
          </p>
          <p className="text-muted-foreground">Matrícula {p.matricula}</p>
        </div>
      </section>

      <section aria-labelledby="salud" className="space-y-3">
        <h2 id="salud" className="text-lg font-semibold">
          Su salud
        </h2>
        <HealthBox
          icon={TriangleAlert}
          title="Alergias"
          items={p.allergies}
          empty="No tiene alergias registradas."
          className="border-critical/25 bg-critical/5 [&_svg]:text-critical [&_h3]:text-critical"
        />
        <HealthBox
          icon={HeartPulse}
          title="Enfermedades que controla"
          items={p.chronic_conditions}
          empty="No tiene enfermedades crónicas registradas."
          className="border-warning/30 bg-warning/8 [&_svg]:text-[#86601f] [&_h3]:text-[#86601f]"
        />
      </section>

      <section aria-labelledby="datos" className="space-y-3">
        <h2 id="datos" className="text-lg font-semibold">
          Datos personales
        </h2>
        <dl className="divide-y rounded-2xl bg-card shadow-xs ring-1 ring-foreground/5">
          {personal.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
              <dt className="shrink-0 text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground">
          Para corregir estos datos, acérquese a Admisión con su carnet.
        </p>
      </section>

      <section aria-labelledby="contacto" className="space-y-3">
        <h2 id="contacto" className="text-lg font-semibold">
          Datos de contacto
        </h2>
        <ContactForm contact={{ phone: p.phone, email: p.email, address: p.address }} />
      </section>
    </>
  )
}

function HealthBox({
  icon: Icon,
  title,
  items,
  empty,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  items: string[]
  empty: string
  className: string
}) {
  return (
    <div className={`flex gap-3 rounded-2xl border p-4 ${items.length ? className : "bg-card"}`}>
      <Icon className="mt-0.5 size-6 shrink-0 text-muted-foreground" />
      <div>
        <h3 className="font-semibold">{title}</h3>
        {items.length ? (
          <ul className="mt-1 space-y-0.5">
            {items.map((item) => (
              <li key={item} className="text-foreground">
                {capitalize(item)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-0.5 text-muted-foreground">{empty}</p>
        )}
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-16 w-2/3 animate-pulse rounded-lg bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      <div className="h-72 animate-pulse rounded-2xl bg-card ring-1 ring-foreground/5" />
    </div>
  )
}
