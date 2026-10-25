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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-BO" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
        <FrameBridge />
      </body>
    </html>
  )
}
