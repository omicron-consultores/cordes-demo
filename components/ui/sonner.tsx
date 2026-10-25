"use client"

import { useSyncExternalStore } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// Los avisos se dibujan con components/layout/notice.tsx (toast.custom): aquí solo posición y ancho.
// Escritorio: arriba al centro, 380 px. Móvil (≤ 600 px, mismo corte que Sonner): abajo a todo el
// ancho; el margen inferior deja libre la navegación del paciente.
const MOBILE = "(max-width: 600px)"
const subscribe = (cb: () => void) => {
  const query = window.matchMedia(MOBILE)
  query.addEventListener("change", cb)
  return () => query.removeEventListener("change", cb)
}

const Toaster = ({ ...props }: ToasterProps) => {
  const mobile = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE).matches,
    () => false,
  )
  return (
    <Sonner
      theme="light"
      position={mobile ? "bottom-center" : "top-center"}
      className="toaster group"
      gap={10}
      offset={{ top: 20 }}
      mobileOffset={{ bottom: 76, left: 12, right: 12 }}
      style={{ "--width": "380px" } as React.CSSProperties}
      {...props}
    />
  )
}

export { Toaster }
