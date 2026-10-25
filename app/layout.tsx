import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { FrameBridge } from "@/components/presentacion/frame-bridge"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "CORDES · Sistema integrado de salud",
  description: "Demo funcional · Caja de Salud CORDES, Regional Cochabamba",
}

// Antes de pintar: ?embed=1 o estar dentro de un iframe (/presentacion) activa el modo incrustado.
// Queda en <html>, así se mantiene al navegar dentro del iframe aunque los links no lleven el parámetro.
const EMBED_SCRIPT = `try{if(new URLSearchParams(location.search).has("embed")||window.self!==window.top)document.documentElement.setAttribute("data-embed","")}catch(e){document.documentElement.setAttribute("data-embed","")}`

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-BO" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: EMBED_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
        <FrameBridge />
      </body>
    </html>
  )
}
