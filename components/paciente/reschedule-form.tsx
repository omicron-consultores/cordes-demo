"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { rescheduleAppointment } from "@/app/(roles)/paciente/actions"
import { Button } from "@/components/ui/button"
import { capitalize, formatDate, formatDateTime, formatTime } from "@/lib/format"
import { SlotPicker } from "./slot-picker"

/** Elegir nuevo día y hora con el mismo médico, y confirmar el cambio. */
export function RescheduleForm({
  appointmentId,
  doctorId,
  currentAt,
  days,
}: {
  appointmentId: string
  doctorId: string
  currentAt: string
  days: string[]
}) {
  const router = useRouter()
  const [slot, setSlot] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [pending, startTransition] = useTransition()

  function confirm() {
    if (!slot) return
    startTransition(async () => {
      const result = await rescheduleAppointment({ appointmentId, newAt: slot })
      if (result.ok) {
        toast.success(`Su cita se cambió al ${formatDateTime(slot)}.`)
        router.replace("/paciente/citas")
      } else {
        toast.error(result.error)
        setSlot(null)
        setReloadKey((k) => k + 1)
      }
    })
  }

  return (
    <div className="space-y-6">
      <SlotPicker doctorId={doctorId} days={days} value={slot} onChange={setSlot} reloadKey={reloadKey} />

      {slot && (
        <div className="rounded-2xl bg-secondary/60 p-4 ring-1 ring-primary/20">
          <p className="text-sm text-muted-foreground">Su cita cambiará</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground line-through">
              {capitalize(formatDate(currentAt))}, {formatTime(currentAt)}
            </span>
            <ArrowRight className="size-4 text-primary" />
            <span className="font-semibold">
              {capitalize(formatDate(slot))}, {formatTime(slot)}
            </span>
          </div>
        </div>
      )}

      <Button size="xl" className="w-full" disabled={!slot || pending} onClick={confirm}>
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "Guardando…" : slot ? "Confirmar cambio" : "Elija el nuevo horario"}
      </Button>
    </div>
  )
}
