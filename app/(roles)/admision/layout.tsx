import { SiteHeader } from "@/components/layout/site-header"

export default function Layout({ children }: LayoutProps<"/admision">) {
  return (
    <>
      <SiteHeader role="admision" />
      {children}
    </>
  )
}
