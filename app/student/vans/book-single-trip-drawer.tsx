import { Info } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { RadioGroup, RadioGroupCard } from "@/components/ui/radio-group"

import type { SingleTripItem } from "./use-single-trips"

type Props = {
  item: SingleTripItem | null
  pointId: string | null
  onPointChange: (id: string) => void
  submitting: boolean
  error: string | null
  onBook: () => void
  onClose: () => void
}

// Drawer "Reservar a diária" da Tela 6: ponto de embarque + Reservar. A diária é ida e volta.
export function BookSingleTripDrawer({ item, pointId, onPointChange, submitting, error, onBook, onClose }: Props) {
  const point = item?.card.van.boardingPoints.find((p) => p.id === pointId)

  return (
    <Drawer open={item !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
      {item && (
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Reservar a diária</DrawerTitle>
            <DrawerDescription>
              Van de {item.operatorFirstName} · {item.card.van.origin} → {item.card.van.destination} · {item.dayLabel}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
            <h3 id="single-points-title" className="titulo-card">
              Onde você embarca?
            </h3>
            <RadioGroup aria-labelledby="single-points-title" value={pointId ?? ""} onValueChange={onPointChange} disabled={submitting}>
              {item.card.van.boardingPoints.map((p) => (
                <RadioGroupCard key={p.id} value={p.id} className="min-h-[68px]">
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="corpo-forte">{p.name}</span>
                    <span className="apoio text-muted-foreground">Ponto {p.order}</span>
                  </span>
                  <span className="titulo-card">{p.time}</span>
                </RadioGroupCard>
              ))}
            </RadioGroup>

            <p className="apoio flex items-start gap-2 text-muted-foreground">
              <Info aria-hidden="true" className="mt-0.5 size-4 flex-none" />
              <span>
                Ida e volta. Você paga {item.priceLabel} pelo app, com Pix simulado. Seu lugar pode voltar para o aluno da vaga fixa até{" "}
                {item.reclaimTime}. Se isso acontecer, você recebe o dinheiro de volta.
              </span>
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DrawerFooter>
            <Button size="lg" disabled={!point || submitting} onClick={onBook}>
              {point ? `Reservar · ${point.name} · ${item.priceLabel}` : "Escolha um ponto pra reservar"}
            </Button>
            <Button variant="ghost" size="lg" onClick={onClose}>
              Agora não
            </Button>
          </DrawerFooter>
        </DrawerContent>
      )}
    </Drawer>
  )
}
