import { SiteFooter } from "@/components/layout/site-footer"

// Pantallas de rol: contenido + pie con logos. (/presentacion queda fuera: pantalla completa.)
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </>
  )
}
