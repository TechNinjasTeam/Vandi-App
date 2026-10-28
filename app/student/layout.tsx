import { Suspense } from "react"

import { StudentLayout } from "@/components/layouts/student-layout"

export default function Layout({ children }: { children: React.ReactNode }) {
  // Com cacheComponents, useParams/usePathname suspendem no prerender de segmento dinâmico (/student/vans/[id]);
  // sem <Suspense> acima o build falha (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-params.md, "Cache Components").
  return (
    <Suspense fallback={null}>
      <StudentLayout>{children}</StudentLayout>
    </Suspense>
  )
}
