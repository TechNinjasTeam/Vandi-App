import { Suspense } from "react"

import { OperatorLayout } from "@/components/layouts/operator-layout"

export default function Layout({ children }: { children: React.ReactNode }) {
  // Rota dinâmica (/operator/routes/[id]/edit): com cacheComponents, usePathname/useParams suspendem no prerender
  // e o build quebra sem um <Suspense> acima (use-params.md, "Cache Components").
  return (
    <Suspense fallback={null}>
      <OperatorLayout>{children}</OperatorLayout>
    </Suspense>
  )
}
