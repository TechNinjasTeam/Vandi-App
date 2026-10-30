"use client"

// CAMADA 1 · diária do aluno na Tela 8. Só desenha e chama o hook. Sem diária não renderiza nada (ou o `children`, se vier).
import { Check, Clock, Phone, RotateCcw, X } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { formatShortDay } from "@/services/clock"
import { formatMoney } from "@/services/dashboard"

import { firstName } from "./enrollment-card"
import { PixDrawer } from "./pix-drawer"
import { useMySingleTrips } from "./use-my-single-trips"

const STATUS = {
  pending: { variant: "semResposta", Icon: Clock, label: "Falta pagar" },
  paid: { variant: "volto", Icon: Check, label: "Pago" },
  cancelled: { variant: "naoVolto", Icon: X, label: "Cancelada" },
} as const

export function SingleTripSection({ studentId, children }: { studentId: string; children?: React.ReactNode }) {
  const { state, retry, drawer, open, close, submitting, drawerError, submit } = useMySingleTrips(studentId)

  if (state.status === "loading") {
    return <Skeleton className="h-[148px] rounded-xl" role="status" aria-busy="true" aria-label="Carregando" />
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

  if (state.trips.length === 0) return <>{children}</>

  return (
    <>
      {state.trips.map((trip) => {
        const { booking, route, boardingPoint, operatorPhone } = trip
        const { variant, Icon, label } = STATUS[booking.status]
        return (
          <Card key={booking.id} role="region" aria-label={`Diária · ${formatShortDay(trip.date)}`}>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle>Diária · {formatShortDay(trip.date)}</CardTitle>
              <Badge variant={variant}>
                <Icon aria-hidden="true" />
                {label}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5 rounded-sm bg-background px-3 py-2.5">
                <span className="legenda text-muted-foreground">Ida · {boardingPoint.name}</span>
                <span className="corpo-forte">{boardingPoint.time}</span>
              </div>
              <span className="apoio flex items-center gap-2 text-muted-foreground">
                <RotateCcw aria-hidden="true" className="size-4" />
                Volta da Facens às {route.returnTime}
              </span>
              {booking.status === "pending" && (
                <Button size="lg" className="w-full" onClick={() => open("pay", trip)}>
                  Pagar {formatMoney(booking.price)} com Pix
                </Button>
              )}
              {trip.atRisk && (
                <span className="apoio text-muted-foreground">
                  Seu lugar pode voltar para o aluno da vaga fixa até {trip.reclaimUntil.slice(11, 16)}. Se isso acontecer, você recebe o
                  dinheiro de volta.
                </span>
              )}
              {trip.canCancel && (
                <Button variant="ghost" size="lg" className="w-full" onClick={() => open("cancel", trip)}>
                  Cancelar diária
                </Button>
              )}
              {!trip.canCancel && booking.status !== "cancelled" && (
                <span className="apoio text-muted-foreground">
                  Não dá mais para cancelar: o prazo era 20h de {formatShortDay(trip.cancelUntil.slice(0, 10))}.
                </span>
              )}
              {booking.status === "cancelled" && (
                <span className="apoio text-muted-foreground">Se você já tinha pago, o valor volta para você.</span>
              )}
              <div className="flex items-center gap-3 border-t border-border pt-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="legenda text-muted-foreground">Motorista</span>
                  <span className="corpo-forte truncate">{firstName(trip.operatorName)}</span>
                  <span className="apoio text-muted-foreground">{operatorPhone}</span>
                </div>
                <Button asChild variant="secondary" size="sm">
                  <a href={`tel:${operatorPhone.replace(/\D/g, "")}`}>
                    <Phone aria-hidden="true" />
                    Ligar
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <PixDrawer
        amount={drawer?.action === "pay" ? formatMoney(drawer.trip.booking.price) : ""}
        open={drawer?.action === "pay"}
        submitting={submitting}
        error={drawerError}
        onPay={submit}
        onClose={close}
      />

      <Drawer open={drawer?.action === "cancel"} onOpenChange={(isOpen) => !isOpen && close()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Cancelar a diária?</DrawerTitle>
            <DrawerDescription>Seu lugar fica livre pra outro aluno.</DrawerDescription>
          </DrawerHeader>
          {drawerError && (
            <Alert variant="destructive" className="mx-4 w-auto">
              <AlertDescription>{drawerError}</AlertDescription>
            </Alert>
          )}
          <DrawerFooter>
            <Button variant="destructive" size="lg" disabled={submitting} onClick={submit}>
              Cancelar diária
            </Button>
            <Button variant="ghost" size="lg" onClick={close}>
              Voltar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}
