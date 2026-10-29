import { ChevronRight } from "lucide-react"
import Link from "next/link"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

import type { VanItem } from "./use-van-search"

const seatsLabel = (free: number) => (free === 1 ? "1 lugar livre" : `${free} lugares livres`)

// Cartão de van da Tela 6: o cartão inteiro leva à Tela 7, inclusive van lotada.
export function VanCard({ item: { van, operatorFirstName, daysLabel, priceLabel } }: { item: VanItem }) {
  const cells = [
    { label: "Ida", value: van.outboundTime },
    { label: "Volta", value: van.returnTime },
    { label: "Por mês", value: priceLabel },
  ]

  return (
    <Link
      href={`/student/vans/${van.id}`}
      className="flex flex-col gap-3 rounded-xl bg-card p-4 text-card-foreground shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex items-center gap-3">
        <Avatar tone="highlight" aria-hidden="true">
          <AvatarFallback>{operatorFirstName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="titulo-card">
            {van.origin} → {van.destination}
          </span>
          <span className="apoio text-muted-foreground">
            Van de {operatorFirstName} · {daysLabel}
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="size-5 flex-none text-muted-foreground" />
      </span>
      <span className="grid grid-cols-3 gap-2">
        {cells.map((cell) => (
          <span key={cell.label} className="flex flex-col gap-0.5 rounded-sm bg-background px-3 py-2.5">
            <span className="legenda text-muted-foreground">{cell.label}</span>
            <span className="corpo-forte">{cell.value}</span>
          </span>
        ))}
      </span>
      {van.full ? (
        <Badge variant="contagem">Lotada por enquanto</Badge>
      ) : (
        <Badge variant="highlight">{seatsLabel(van.freeSeats)}</Badge>
      )}
    </Link>
  )
}
