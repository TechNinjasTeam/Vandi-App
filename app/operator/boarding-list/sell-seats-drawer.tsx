"use client"

// CAMADA 1 · Drawer "Vender lugares sobrando" da Tela 9. Só desenha e chama o hook.
import { Info, Minus, Plus } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import type { Route, SeatBalance } from "@/types"

import { useSellSeats } from "./use-sell-seats"

export const SellSeatsDrawer = ({
  operatorId,
  route,
  balance,
  onAnnounced,
}: {
  operatorId: string
  route: Route
  balance: SeatBalance
  onAnnounced: () => void
}) => {
  const sell = useSellSeats(operatorId, route, balance, onAnnounced)
  const { offer, sellable } = balance
  const noSeats = sellable === 0 && !offer

  return (
    <>
      <Card role="region" aria-label="Lugares avulsos" className="flex-row items-center gap-3 px-4">
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="corpo-forte">Lugares avulsos · {sell.price}</span>
          <span className="apoio text-muted-foreground">
            {noSeats
              ? "Nenhum lugar sobrando nos dois trechos."
              : offer
                ? `${balance.outbound.sold} de ${offer.seats} reservados`
                : "Nenhum lugar anunciado."}
          </span>
        </div>
        {!noSeats && (
          <Button variant="secondary" onClick={() => sell.onOpenChange(true)}>
            {offer ? "Editar" : "Vender lugares"}
          </Button>
        )}
      </Card>

      <Drawer open={sell.open} onOpenChange={sell.onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Vender lugares sobrando</DrawerTitle>
            <DrawerDescription>Diária de {sell.dayLabel}: ida e volta.</DrawerDescription>
          </DrawerHeader>

          <div className="flex items-center gap-3">
            <span id="sell-quantity" className="corpo-forte flex-1">
              Quantos lugares?
            </span>
            <div role="group" aria-labelledby="sell-quantity" className="flex items-center gap-1 rounded-md bg-background p-1">
              <Button
                variant="outline"
                size="icon"
                aria-label="Menos um lugar"
                disabled={sell.quantity <= 1}
                onClick={sell.decrease}
              >
                <Minus />
              </Button>
              <span aria-live="polite" className="titulo-card min-w-8 text-center tabular-nums">
                {sell.quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Mais um lugar"
                disabled={sell.quantity >= sellable}
                onClick={sell.increase}
              >
                <Plus />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="corpo-forte">Preço da diária</span>
            <span className="corpo-forte flex h-12 items-center rounded-md border border-input px-4">{sell.price}</span>
            <span className="legenda text-muted-foreground">
              Mensalidade ({sell.monthlyPrice}) ÷ {sell.businessDays} dias úteis × 1,6, arredondado pra cima.
            </span>
          </div>

          <div className="flex items-start gap-2 rounded-md bg-background px-3 py-2.5">
            <Info className="mt-0.5 size-4 shrink-0 text-secondary-foreground" aria-hidden="true" />
            <span className="apoio">
              Ida e volta. Quem reservar paga pelo app. Se um aluno da vaga fixa voltar a ocupar o lugar, o anúncio
              diminui sozinho.
            </span>
          </div>

          {sell.error && (
            <Alert variant="destructive">
              <AlertDescription>{sell.error}</AlertDescription>
            </Alert>
          )}

          <DrawerFooter>
            <Button size="lg" disabled={sell.quantity < 1 || sell.submitting} onClick={sell.announce}>
              Anunciar {sell.quantity} {sell.quantity === 1 ? "lugar" : "lugares"} · {sell.price}
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" size="lg">
                Agora não
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}
