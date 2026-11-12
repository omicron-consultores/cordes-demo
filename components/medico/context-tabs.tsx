"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Tab = "resumen" | "consultas" | "examenes"
type ExamLink = {
  /** Lleva a la pestaña Exámenes y resalta ese estudio (id de `examTarget`). */
  openExam: (target: string) => void
  /** `n` cambia en cada clic: el mismo estudio se vuelve a resaltar. */
  highlight: { target: string; n: number } | null
}

const ExamLinkContext = createContext<ExamLink>({ openExam: () => {}, highlight: null })
export const useExamLink = () => useContext(ExamLinkContext)

// p-px: que el ring de las tarjetas no quede recortado por el overflow.
const PANEL = "min-h-0 overflow-y-auto p-px lg:pr-2"

/** Pestañas de la columna de contexto. Los paneles llegan ya renderizados desde el servidor. */
export function ContextTabs({
  consultasCount,
  flagged,
  resumen,
  consultas,
  examenes,
}: {
  consultasCount: number
  flagged: number
  resumen: React.ReactNode
  consultas: React.ReactNode
  examenes: React.ReactNode
}) {
  const [tab, setTab] = useState<Tab>("resumen")
  const [highlight, setHighlight] = useState<ExamLink["highlight"]>(null)

  const openExam = useCallback((target: string) => {
    setTab("examenes")
    setHighlight((h) => ({ target, n: (h?.n ?? 0) + 1 }))
  }, [])
  const link = useMemo(() => ({ openExam, highlight }), [openExam, highlight])

  return (
    <ExamLinkContext value={link}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="h-full gap-3">
        <TabsList className="w-full shrink-0 group-data-horizontal/tabs:h-10">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="consultas">
            Consultas <span className="text-muted-foreground tabular-nums">({consultasCount})</span>
          </TabsTrigger>
          <TabsTrigger value="examenes">
            Exámenes
            {flagged > 0 && (
              <span
                className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-highlight px-1.5 text-xs font-semibold text-highlight-foreground tabular-nums"
                title="Estudios pendientes o con el último resultado fuera de rango"
              >
                {flagged}
                <span className="sr-only"> pendientes o fuera de rango</span>
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className={PANEL}>
          {resumen}
        </TabsContent>
        <TabsContent value="consultas" className={PANEL}>
          {consultas}
        </TabsContent>
        <TabsContent value="examenes" className={PANEL}>
          {examenes}
        </TabsContent>
      </Tabs>
    </ExamLinkContext>
  )
}
