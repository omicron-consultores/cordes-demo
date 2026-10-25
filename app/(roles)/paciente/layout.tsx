import { SiteHeader } from "@/components/layout/site-header"
import { PatientAppBar } from "@/components/paciente/app-bar"
import { PatientNav } from "@/components/paciente/patient-nav"

// Mobile-first (390 px). En el celular (y en el marco de /presentacion) la cabecera es la barra
// compacta de app; desde 640 px, la cabecera normal y una columna de 430 px centrada.
// La navegación es sticky dentro de la columna: no tapa contenido ni el pie.
export default function Layout({ children }: LayoutProps<"/paciente">) {
  return (
    <>
      <SiteHeader role="paciente" className="hidden sm:block" />
      <div className="flex flex-1 flex-col sm:bg-muted/70 embed:bg-background">
        <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-1 flex-col bg-background sm:min-h-[calc(100dvh-4rem)] sm:shadow-[0_0_48px_-16px_rgba(15,36,48,0.18)] embed:min-h-dvh embed:shadow-none">
          <PatientAppBar />
          <div className="flex flex-1 flex-col">{children}</div>
          <PatientNav />
        </div>
      </div>
    </>
  )
}
