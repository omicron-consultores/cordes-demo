"use client"

import { usePathname } from "next/navigation"
import { Suspense, useEffect } from "react"

/** Mensajes de una pantalla dentro de /presentacion hacia la página que la contiene. */
export type FrameMessage = { type: "cordes:route"; path: string } | { type: "cordes:step"; key: string }

/**
 * Solo actúa dentro de un iframe (/presentacion): avisa al marco padre la ruta actual (para marcar
 * el paso) y le reenvía las teclas 1–5, que de otro modo se quedarían en el iframe con el foco.
 * Mismo origen únicamente.
 */
export function FrameBridge() {
  // usePathname en rutas dinámicas se resuelve al pedir la página (cacheComponents).
  return (
    <Suspense fallback={null}>
      <Bridge />
    </Suspense>
  )
}

function Bridge() {
  const pathname = usePathname()

  useEffect(() => {
    if (window.parent !== window) post({ type: "cordes:route", path: pathname })
  }, [pathname])

  useEffect(() => {
    if (window.parent === window) return
    const onKey = (e: KeyboardEvent) => {
      if (!/^[1-5]$/.test(e.key) || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      post({ type: "cordes:step", key: e.key })
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return null
}

function post(message: FrameMessage) {
  window.parent.postMessage(message, window.location.origin)
}

/** Teclas escritas en un campo (cantidades, búsquedas…) no cambian de paso. */
export function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  )
}
