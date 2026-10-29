"use client"

import { usePathname } from "next/navigation"
import { MapPin, Search, User } from "lucide-react"

import { BottomNav, type BottomNavItem } from "@/components/bottom-nav"
import { Skeleton } from "@/components/ui/skeleton"
import { useAreaLayout } from "@/hooks/use-area-layout"

const items: BottomNavItem[] = [
  { href: "/student/vans", label: "Buscar", icon: Search },
  { href: "/student/my-route", label: "Minha rota", icon: MapPin },
  { href: "/student/profile", label: "Perfil", icon: User },
]

// Guarda + moldura do aluno: sem sessão ou papel errado vai para /sign-in.
export function StudentLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAreaLayout("student")
  const pathname = usePathname()

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
          {/* Tela 7 (Ver a van): rodapé de ação fixo, sem barra (VerVan.dc.html, DEC-052). */}
          {!/^\/student\/vans\/[^/]+$/.test(pathname) && <BottomNav items={items} />}
        </>
      )}
    </div>
  )
}
