"use client"

import { useState, useTransition } from "react"
import { Loader2, MoreVertical, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { resetDemo } from "@/app/actions"
import { Button } from "@/components/ui/button"
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
  const [pending, startTransition] = useTransition()

  function reset() {
    startTransition(async () => {
      const result = await resetDemo()
      setConfirmOpen(false)
      if (result.ok) toast.success("Demo reiniciada: los datos volvieron a su estado inicial.")
      else toast.error(result.error)
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

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !pending && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reiniciar la demo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrarán las citas, atenciones, recetas y movimientos de inventario creados y se
              restaurarán los datos iniciales en todos los dispositivos.
            </AlertDialogDescription>
          </AlertDialogHeader>
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
