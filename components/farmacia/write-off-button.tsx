"use client"

import { useState, useTransition } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { writeOffExpiredLot } from "@/app/(roles)/farmacia/actions"
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
import { FormAlert } from "@/components/layout/form-alert"
import { notify } from "@/components/layout/notice"
import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format"

/** "Dar de baja" un lote vencido (write_off_expired_lot), con confirmación. */
export function WriteOffButton({ lotId, summary, quantity }: { lotId: string; summary: string; quantity: number }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function confirm() {
    setError(null)
    startTransition(async () => {
      const result = await writeOffExpiredLot(lotId)
      if (result.ok) {
        setOpen(false)
        notify.success("Lote dado de baja por vencimiento", { description: summary })
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <Button variant="outline" className="border-critical/40 text-critical hover:bg-critical/10" onClick={() => setOpen(true)}>
        <Trash2 />
        Dar de baja
      </Button>

      <AlertDialog open={open} onOpenChange={(next) => {
          if (pending) return
          setOpen(next)
          setError(null)
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dar de baja el lote vencido?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{summary}</strong>. Saldrán del inventario{" "}
              <strong className="text-foreground tabular-nums">{formatNumber(quantity)}</strong> unidades y quedará
              registrado en el kardex como baja por vencimiento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FormAlert message={error} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={confirm} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Sí, dar de baja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
