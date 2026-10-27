"use client"

import { usePathname } from "next/navigation"
import { House, User, Users } from "lucide-react"

import { BottomNav, type BottomNavItem } from "@/components/bottom-nav"
import { Skeleton } from "@/components/ui/skeleton"
import { useAreaLayout } from "@/hooks/use-area-layout"

// Guarda + moldura do operador: sem sessão ou papel errado vai para /sign-in.
export function OperatorLayout({ children }: { children: React.ReactNode }) {
  const { status, pendingRequests } = useAreaLayout("operator")
  const pathname = usePathname()

  const items: BottomNavItem[] = [
    { href: "/operator", label: "Início", icon: House },
    { href: "/operator/requests", label: "Pedidos", icon: Users, count: pendingRequests },
    { href: "/operator/profile", label: "Perfil", icon: User },
  ]

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background">
      {status === "checking" ? (
        <main className="flex flex-1 flex-col gap-6 px-4 pt-6 pb-6" aria-busy="true" aria-label="Carregando">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-[148px] rounded-xl" />
        </main>
      ) : (
        <>
          <main className="flex flex-1 flex-col gap-6 px-4 pt-6 pb-6">{children}</main>
          {/* DEC-052: criar rota usa rodapé de ação, sem barra. */}
          {pathname !== "/operator/new-route" && <BottomNav items={items} />}
        </>
      )}
    </div>
  )
}
