import { PharmacyNav } from "@/components/farmacia/pharmacy-nav"
import { SiteHeader } from "@/components/layout/site-header"

export default function Layout({ children }: LayoutProps<"/farmacia">) {
  return (
    <>
      <SiteHeader role="farmacia" />
      <PharmacyNav />
      {children}
    </>
  )
}
