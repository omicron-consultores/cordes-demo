"use client"

import { useState, useTransition } from "react"
import { Loader2, UserX } from "lucide-react"
import { markNoShow } from "@/app/(roles)/admision/actions"
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

export function NoShowButton({
  appointmentId,
  summary,
  emphasized,
}: {
  appointmentId: string
  summary: string
  emphasized: boolean
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function confirm() {
    setError(null)
    startTransition(async () => {
      const result = await markNoShow(appointmentId)
      if (result.ok) {
        setOpen(false)
        notify.success("Cita marcada como “No asistió”", { description: summary })
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <Button
        variant={emphasized ? "outline" : "ghost"}
        size="sm"
        className="whitespace-nowrap text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <UserX />
        No asistió
      </Button>

      <AlertDialog open={open} onOpenChange={(next) => {
          if (pending) return
          setOpen(next)
          setError(null)
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar que no asistió?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{summary}</strong>. La cita quedará como “No asistió” y
              el horario se liberará para otro paciente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FormAlert message={error} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={confirm} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Sí, no asistió
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
