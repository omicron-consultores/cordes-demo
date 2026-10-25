"use client"

import Image from "next/image"
import { useEffect, useEffectEvent, useRef, useState } from "react"
import Link from "next/link"
import { BarChart3, Boxes, ClipboardList, LogOut, Pill, RotateCcw, Stethoscope, type LucideIcon } from "lucide-react"
import { ResetDemoDialog } from "@/components/layout/demo-menu"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import chemonicsLogo from "@/public/brand/chemonics.png"
import cordesLogo from "@/public/brand/cordes.png"
import omicronLogo from "@/public/brand/omicron-white.png"
import { isTyping, type FrameMessage } from "./frame-bridge"

const STEPS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Admisión", href: "/admision", icon: ClipboardList },
  { label: "Médico", href: "/medico", icon: Stethoscope },
  { label: "Farmacia", href: "/farmacia", icon: Pill },
  { label: "Inventario", href: "/farmacia/inventario", icon: Boxes },
  { label: "Gerencia", href: "/gerencia", icon: BarChart3 },
]

// Las pantallas se cargan en modo incrustado: sin cabecera ni pie de la app (ver app/layout.tsx).
const embed = (href: string) => `${href}?embed=1`

// Pantalla del celular (390×844) + marco de 12 px por lado.
const BEZEL = 12
const PHONE_W = 390 + BEZEL * 2
const PHONE_H = 844 + BEZEL * 2

/**
 * Vista para presentar: el celular del paciente a la izquierda y el rol del establecimiento a la
 * derecha, con pasos 1–5 (botones o teclas). Ambos iframes son del mismo origen y comparten cookies:
 * el rol lo define la ruta y la persona va en cookies separadas, así que no se pisan.
 */
export function PresentationView() {
  const phoneRef = useRef<HTMLIFrameElement>(null)
  const roleRef = useRef<HTMLIFrameElement>(null)
  const [active, setActive] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { boxRef, scale } = usePhoneScale()

  function go(index: number) {
    setActive(index)
    roleRef.current?.contentWindow?.location.assign(embed(STEPS[index].href))
  }

  // Teclas 1–5 en esta página o reenviadas desde los iframes; el paso se marca según la ruta del iframe.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (confirmOpen || !/^[1-5]$/.test(e.key) || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
    go(Number(e.key) - 1)
  })
  const onMessage = useEffectEvent((e: MessageEvent<FrameMessage>) => {
    if (e.origin !== window.location.origin) return
    if (e.data?.type === "cordes:step" && !confirmOpen) go(Number(e.data.key) - 1)
    if (e.data?.type === "cordes:route" && e.source === roleRef.current?.contentWindow) {
      const index = stepOf(e.data.path)
      if (index !== null) setActive(index)
    }
  })
  useEffect(() => {
    const key = (e: KeyboardEvent) => onKey(e)
    const message = (e: MessageEvent<FrameMessage>) => onMessage(e)
    window.addEventListener("keydown", key)
    window.addEventListener("message", message)
    return () => {
      window.removeEventListener("keydown", key)
      window.removeEventListener("message", message)
    }
  }, [])

  // Tras reiniciar, los UUID cambian: cada iframe vuelve al inicio de su pantalla.
  function reloadFrames() {
    phoneRef.current?.contentWindow?.location.replace(embed("/paciente"))
    roleRef.current?.contentWindow?.location.replace(embed(STEPS[active].href))
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-muted">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-card px-5">
        <Image src={cordesLogo} alt="CORDES Cochabamba" priority className="h-8 w-auto" />
        <span className="hidden border-l pl-4 text-sm text-muted-foreground lg:block">
          Sistema integrado de salud · Caja de Salud CORDES, Regional Cochabamba
        </span>
        <div className="ml-auto flex items-center gap-4">
          {/* Los logos de socios disponibles son versiones claras: van sobre fondo oscuro, como en el pie. */}
          <div className="flex h-10 items-center gap-5 rounded-lg bg-foreground px-4">
            <Image src={chemonicsLogo} alt="Chemonics International" className="h-5 w-auto" />
            <Image src={omicronLogo} alt="OMICRON Consultores" className="h-6 w-auto" />
          </div>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}>
            <RotateCcw />
            Reiniciar demo
          </Button>
          {/* En modo incrustado las pantallas no muestran su menú ⋮: la salida está aquí. */}
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>
            <LogOut />
            Salir
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-5 p-4 xl:gap-8 xl:p-6">
        <section aria-label="Celular del paciente" className="flex shrink-0 flex-col items-center gap-2">
          <p className="text-sm font-medium text-muted-foreground">Paciente · celular</p>
          <div ref={boxRef} className="min-h-0 flex-1">
            <div className="relative" style={{ width: PHONE_W * scale, height: PHONE_H * scale }}>
              <div
                className="absolute top-0 left-0 origin-top-left rounded-[3.25rem] bg-[#0f2430] shadow-2xl ring-1 ring-black/20"
                style={{ width: PHONE_W, height: PHONE_H, padding: BEZEL, transform: `scale(${scale})` }}
              >
                <iframe
                  ref={phoneRef}
                  src={embed("/paciente")}
                  title="App del paciente"
                  className="size-full rounded-[2.5rem] bg-background"
                />
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Establecimiento" className="flex min-w-0 flex-1 flex-col gap-3">
          <nav aria-label="Pasos de la demo" className="flex shrink-0 flex-wrap items-center gap-2">
            {STEPS.map((step, i) => (
              <button
                key={step.href}
                type="button"
                onClick={() => go(i)}
                aria-current={active === i ? "step" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-full border pr-4 pl-1.5 text-sm font-medium transition-colors",
                  active === i
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                    active === i ? "bg-white/20" : "bg-muted",
                  )}
                >
                  {i + 1}
                </span>
                <step.icon className="size-4" />
                {step.label}
              </button>
            ))}
            <span className="ml-auto hidden text-xs text-muted-foreground xl:block">Teclas 1–5 para cambiar de paso</span>
          </nav>
          {/* Monitor: marco gris grueso y casi cuadrado; la pantalla va encima con esquinas más redondas. */}
          <div className="min-h-0 flex-1 rounded-[3px] bg-[#4b5258] p-3 shadow-2xl ring-1 ring-black/25">
            <div className="size-full overflow-hidden rounded-xl bg-card shadow-[0_1px_4px_rgba(0,0,0,0.45)] ring-1 ring-black/30">
              <iframe ref={roleRef} src={embed(STEPS[0].href)} title="Pantalla del establecimiento" className="size-full" />
            </div>
          </div>
        </section>
      </div>

      <ResetDemoDialog open={confirmOpen} onOpenChange={setConfirmOpen} onReset={reloadFrames} />
    </div>
  )
}

/** Escala del celular para que entre en el alto disponible (1 en 1080 px; ~0,78 en 768 px). */
function usePhoneScale() {
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.height / PHONE_H)))
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  return { boxRef, scale }
}

/** Paso al que pertenece una ruta (el más específico): /farmacia/inventario → 4, /farmacia/receta/… → 3. */
function stepOf(path: string): number | null {
  let best: number | null = null
  for (let i = 0; i < STEPS.length; i++) {
    const href = STEPS[i].href
    const match = path === href || path.startsWith(`${href}/`)
    if (match && (best === null || href.length > STEPS[best].href.length)) best = i
  }
  return best
}
