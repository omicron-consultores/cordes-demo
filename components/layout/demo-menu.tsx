"use client"

import { useState, useTransition } from "react"
import { Loader2, MoreVertical, RotateCcw } from "lucide-react"
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
  const [confirmOpen, setConfirmOpen] = useState(false)
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
      setConfirmOpen(false)
      notify.success("Demo reiniciada", { description: "Los datos volvieron a su estado inicial." })
    })
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
          <DropdownMenuItem onClick={() => setConfirmOpen(true)} className="gap-2.5 py-2">
            <RotateCcw />
            Reiniciar demo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (pending) return
          setConfirmOpen(open)
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
    </>
  )
}
