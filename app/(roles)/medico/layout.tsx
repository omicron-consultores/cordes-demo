import { SiteHeader } from "@/components/layout/site-header"

export default function Layout({ children }: LayoutProps<"/medico">) {
  return (
    <>
      <SiteHeader role="medico" />
      {children}
    </>
  )
}
