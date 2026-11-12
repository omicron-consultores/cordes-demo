"use client"

import { useState } from "react"
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const ZOOMS = [1, 1.5, 2, 3, 4]

/** Miniatura de un estudio de imagen que abre un visor a pantalla completa con zoom. */
export function ImageViewer({ src, title }: { src: string; title: string }) {
  const [zoom, setZoom] = useState(0)
  const scale = ZOOMS[zoom]

  return (
    <Dialog onOpenChange={(open) => !open && setZoom(0)}>
      <DialogTrigger
        className="group/thumb relative block w-28 shrink-0 overflow-hidden rounded-lg bg-black ring-1 ring-foreground/10 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`Ver imagen: ${title}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen estática de /public, sin optimizar */}
        <img src={src} alt="" className="aspect-4/3 w-full object-cover opacity-90 transition-opacity group-hover/thumb:opacity-100" />
        <span className="absolute right-1.5 bottom-1.5 flex size-6 items-center justify-center rounded-md bg-black/60 text-white">
          <Maximize2 className="size-3.5" />
        </span>
      </DialogTrigger>

      <DialogContent className="flex h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden bg-neutral-950 p-0 text-white ring-white/10 sm:max-w-[calc(100%-2rem)] [&>[data-slot=dialog-close]]:text-white [&>[data-slot=dialog-close]]:hover:bg-white/10">
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 py-2 pr-14 pl-4">
          <DialogTitle className="min-w-0 flex-1 truncate text-base font-medium">{title}</DialogTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={() => setZoom((z) => Math.max(z - 1, 0))}
            disabled={zoom === 0}
            aria-label="Alejar"
          >
            <ZoomOut />
          </Button>
          <span className="w-12 text-center text-sm tabular-nums">{Math.round(scale * 100)} %</span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={() => setZoom((z) => Math.min(z + 1, ZOOMS.length - 1))}
            disabled={zoom === ZOOMS.length - 1}
            aria-label="Acercar"
          >
            <ZoomIn />
          </Button>
        </div>

        {/* m-auto dentro de flex: centra la imagen sin recortarla al hacer zoom (se desplaza con scroll). */}
        <div className="flex min-h-0 flex-1 overflow-auto p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen estática de /public, sin optimizar */}
          <img
            src={src}
            alt={title}
            onClick={() => setZoom((z) => (z === 0 ? 2 : 0))}
            style={scale > 1 ? { width: `${scale * 100}%`, maxWidth: "none" } : undefined}
            className={cn("m-auto", scale > 1 ? "h-auto cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain")}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
