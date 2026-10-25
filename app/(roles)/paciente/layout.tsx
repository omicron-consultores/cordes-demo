import { SiteHeader } from "@/components/layout/site-header"
import { PatientAppBar } from "@/components/paciente/app-bar"
import { PatientNav } from "@/components/paciente/patient-nav"

// Mobile-first (390 px). En el celular (y en el marco de /presentacion) ocupa toda la pantalla.
// Desde 640 px se dibuja dentro de un celular (marco oscuro, 390×844 de pantalla) bajo la cabecera
// normal: el contenido se desplaza dentro de la pantalla y la navegación queda fija abajo.
// En escritorio la cabecera no es sticky (el celular ya tiene su propio scroll): al bajar hasta el pie
// no tapa la parte de arriba del celular. `isolate` mantiene las barras sticky del celular en su capa.
export default function Layout({ children }: LayoutProps<"/paciente">) {
  return (
    <>
      <SiteHeader role="paciente" className="hidden sm:static sm:block" />
      <div className="flex flex-1 flex-col sm:items-center sm:bg-muted/70 sm:py-6 embed:bg-background embed:py-0">
        <div className="isolate mx-auto flex min-h-dvh w-full max-w-[430px] flex-1 flex-col bg-background sm:h-[min(868px,calc(100dvh-7rem))] sm:min-h-[560px] sm:w-[414px] sm:max-w-none sm:flex-none sm:overflow-hidden sm:rounded-[3.25rem] sm:border-12 sm:border-[#0f2430] sm:shadow-2xl embed:min-h-dvh embed:border-0 embed:shadow-none">
          <div className="flex flex-1 flex-col sm:overflow-y-auto sm:rounded-[2.5rem] sm:[scrollbar-width:none]">
            <PatientAppBar />
            <div className="flex flex-1 flex-col">{children}</div>
            <PatientNav />
          </div>
        </div>
      </div>
    </>
  )
}
