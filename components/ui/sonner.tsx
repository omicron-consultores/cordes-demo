"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

// Los avisos se dibujan con components/layout/notice.tsx (toast.custom): aquí solo posición y ancho.
// Escritorio: esquina inferior derecha, 380 px. Móvil (< 600 px): Sonner los pone a todo el ancho;
// el margen inferior deja libre la navegación del paciente.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      className="toaster group"
      gap={10}
      mobileOffset={{ bottom: 76, left: 12, right: 12 }}
      style={{ "--width": "380px" } as React.CSSProperties}
      {...props}
    />
  )
}

export { Toaster }
