"use client"

import { useState, useTransition } from "react"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { cancelAppointment } from "@/app/(roles)/paciente/actions"
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
import { Button } from "@/components/ui/button"

export function CancelAppointmentButton({ appointmentId, when }: { appointmentId: string; when: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function confirm() {
    startTransition(async () => {
      const result = await cancelAppointment(appointmentId)
      if (result.ok) {
        setOpen(false)
        toast.success("Su cita fue cancelada.")
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <Button variant="outline" size="xl" className="text-critical hover:text-critical" onClick={() => setOpen(true)}>
        <X />
        Cancelar
      </Button>

      <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <AlertDialogContent className="data-[size=default]:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">¿Cancelar esta cita?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Su cita del <strong className="text-foreground">{when}</strong> quedará cancelada y el
              horario se liberará para otro paciente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="xl" disabled={pending}>
              No, mantener
            </AlertDialogCancel>
            <AlertDialogAction
              size="xl"
              className="bg-critical text-critical-foreground hover:bg-critical/90"
              onClick={confirm}
              disabled={pending}
            >
              {pending && <Loader2 className="animate-spin" />}
              Sí, cancelar cita
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
