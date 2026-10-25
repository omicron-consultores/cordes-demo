import type { Metadata } from "next"
import { PresentationView } from "@/components/presentacion/presentation-view"

export const metadata: Metadata = {
  title: "Presentación · CORDES",
}

// Pantalla completa para presentar (1920×1080, también 1366×768): celular del paciente + rol elegido.
export default function Page() {
  return <PresentationView />
}
