// Vandi · cofre: Design System/Código/components/bottom-nav.tsx (copiar 1:1)
// Barra de navegação cheia no rodapé, como nas telas: ícone em cima, rótulo embaixo.
// Não existe no shadcn. Usada pelos layouts de papel (components/layouts/*-layout.tsx).
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type BottomNavItem = {
  href: string
  label: string
  icon: LucideIcon
  /** Bolha lima com número (ex.: pedidos novos). Some quando é 0 ou vazio. */
  count?: number
}

function isActive(pathname: string, href: string) {
  if (pathname === href) return true
  // "/operator" não pode ficar ativo em "/operator/dashboard": só prefixo de rota filha
  const isRoot = href.split("/").filter(Boolean).length <= 1
  return !isRoot && pathname.startsWith(`${href}/`)
}

export function BottomNav({
  items,
  className,
}: {
  items: BottomNavItem[]
  className?: string
}) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegação principal"
      data-slot="bottom-nav"
      className={cn(
        "sticky bottom-0 z-40 grid auto-cols-fr grid-flow-col border-t border-border bg-card px-2 pb-[env(safe-area-inset-bottom)]",
        className
      )}
    >
      {items.map(({ href, label, icon: Icon, count }) => {
        const active = isActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-[62px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-sm text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              active
                ? "font-black text-secondary-foreground"
                : "font-bold text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="relative flex">
              <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
              {count ? (
                <span className="micro absolute -top-1.5 -right-2.5 h-[18px] min-w-[18px] rounded-full bg-highlight px-[5px] text-center leading-[18px] text-highlight-foreground">
                  {count}
                  <span className="sr-only"> novos</span>
                </span>
              ) : null}
            </span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
