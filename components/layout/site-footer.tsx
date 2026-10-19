import Image from "next/image"
import chemonicsLogo from "@/public/brand/chemonics.png"
import omicronLogo from "@/public/brand/omicron-white.png"

// Fondo oscuro: los logos de socios disponibles son versiones claras.
export function SiteFooter() {
  return (
    <footer className="mt-auto bg-foreground">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-5 sm:flex-row sm:justify-between md:px-6">
        <div className="flex items-center gap-7">
          <Image src={chemonicsLogo} alt="Chemonics International" className="h-6 w-auto" />
          <Image src={omicronLogo} alt="OMICRON Consultores" className="h-8 w-auto" />
        </div>
        <p className="text-[11px] text-white/35">Demo · datos ficticios</p>
      </div>
    </footer>
  )
}
