import { SiteHeader } from "@/components/layout/site-header"
import { PatientAppBar } from "@/components/paciente/app-bar"
import { PatientNav } from "@/components/paciente/patient-nav"

// Mobile-first (390 px). En escritorio, columna centrada tipo teléfono.
// La navegación es sticky dentro de la columna: al final de la página no tapa el pie.
// En modo incrustado (marco del celular en /presentacion) la cabecera es la barra compacta de app.
export default function Layout({ children }: LayoutProps<"/paciente">) {
  return (
    <>
      <SiteHeader role="paciente" />
      <div className="flex flex-1 flex-col sm:bg-muted/70 embed:bg-background">
        <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[430px] flex-1 flex-col bg-background sm:border-x sm:shadow-sm embed:min-h-dvh embed:border-0 embed:shadow-none">
          <PatientAppBar />
          <div className="flex flex-1 flex-col">{children}</div>
          <PatientNav />
        </div>
      </div>
    </>
  )
}
