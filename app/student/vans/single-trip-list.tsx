"use client"

// Aba "Só um dia" da Tela 6: diárias à venda (ida e volta) e o Drawer de reserva.
import { Bus, ChevronRight, Search } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

import { BookSingleTripDrawer } from "./book-single-trip-drawer"
import { useSingleTrips } from "./use-single-trips"

export function SingleTripList() {
  const { state, query, search, retry, selected, select, close, pointId, setPointId, submitting, submitError, book } = useSingleTrips()

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Carregando">
        <Skeleton className="h-[86px] rounded-md" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[172px] rounded-xl" />
          <Skeleton className="h-[172px] rounded-xl" />
        </div>
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-3">
        <Alert variant="destructive">
          <AlertDescription>Não deu pra carregar. Tenta de novo.</AlertDescription>
        </Alert>
        <Button variant="secondary" size="lg" onClick={retry}>
          Tentar de novo
        </Button>
      </div>
    )
  }

  const { items } = state

  return (
    <div className="flex flex-col gap-6">
      <form role="search" className="flex flex-col gap-1.5" onSubmit={(event) => event.preventDefault()}>
        <Label htmlFor="single-city">De onde você sai?</Label>
        <div className="relative flex">
          <Search aria-hidden="true" className="pointer-events-none absolute top-3.5 left-3.5 size-5 text-muted-foreground" />
          <Input
            id="single-city"
            type="search"
            autoComplete="address-level2"
            placeholder="Sua cidade"
            className="pl-11"
            value={query}
            onChange={(event) => search(event.target.value)}
          />
        </div>
      </form>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center">
          <span aria-hidden="true" className="mb-1 flex size-12 items-center justify-center rounded-full bg-inverse text-inverse-foreground">
            <Bus className="size-5" />
          </span>
          <span className="titulo-card">Nenhuma diária à venda pra essa cidade.</span>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const { card } = item
            const cells = [
              { label: "Ida", value: card.van.outboundTime },
              { label: "Diária", value: item.priceLabel },
              { label: "Sobram", value: String(card.available) },
            ]
            return (
              <li key={card.offerId}>
                <button
                  type="button"
                  onClick={() => select(item)}
                  className="flex min-h-11 w-full flex-col gap-3 rounded-xl bg-card p-4 text-left text-card-foreground shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span className="flex items-center gap-3">
                    <Avatar tone="highlight" aria-hidden="true">
                      <AvatarFallback>{item.operatorFirstName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="titulo-card">
                        {card.van.origin} → {card.van.destination}
                      </span>
                      <span className="apoio text-muted-foreground">Van de {item.operatorFirstName} · ida e volta</span>
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
                  <Badge variant="highlight">{item.dayLabel}</Badge>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <BookSingleTripDrawer
        item={selected}
        pointId={pointId}
        onPointChange={setPointId}
        submitting={submitting}
        error={submitError}
        onBook={book}
        onClose={close}
      />
    </div>
  )
}
