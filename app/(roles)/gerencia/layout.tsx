import { SiteHeader } from "@/components/layout/site-header"

export default function Layout({ children }: LayoutProps<"/gerencia">) {
  return (
    <>
      <SiteHeader role="gerencia" />
      {children}
    </>
  )
}
