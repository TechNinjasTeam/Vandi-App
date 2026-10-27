"use client"

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
          <BottomNav items={items} />
        </>
      )}
    </div>
  )
}
