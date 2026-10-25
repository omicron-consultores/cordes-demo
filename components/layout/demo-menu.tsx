"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Loader2, MoreVertical, Presentation, RotateCcw } from "lucide-react"
import { resetDemo } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { FormAlert } from "./form-alert"
import { notify } from "./notice"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DemoMenu() {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Dentro de /presentacion este menú vive en un iframe: la ventana principal vuelve al inicio.
  function togglePresentation() {
    const top = window.top ?? window
    if (top.location.pathname === "/presentacion") top.location.assign("/")
    else router.push("/presentacion")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-lg" aria-label="Más opciones" />}
        >
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={togglePresentation} className="gap-2.5 py-2">
            <Presentation />
            Vista presentación
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmOpen(true)} className="gap-2.5 py-2">
            <RotateCcw />
            Reiniciar demo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ResetDemoDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  )
}

/** Confirmación de "Reiniciar demo" (reset_demo). `onReset` corre tras reiniciar (p. ej. recargar iframes). */
export function ResetDemoDialog({
  open,
  onOpenChange,
  onReset,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReset?: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function reset() {
    setError(null)
    startTransition(async () => {
      const result = await resetDemo()
      if (!result.ok) {
        setError(result.error)
        return
      }
      onOpenChange(false)
      onReset?.()
      notify.success("Demo reiniciada", { description: "Los datos volvieron a su estado inicial." })
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        onOpenChange(next)
        setError(null)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Reiniciar la demo?</AlertDialogTitle>
          <AlertDialogDescription>
            Se borrarán las citas, atenciones, recetas y movimientos de inventario creados y se
            restaurarán los datos iniciales en todos los dispositivos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormAlert message={error} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={reset} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {pending ? "Reiniciando…" : "Sí, reiniciar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
