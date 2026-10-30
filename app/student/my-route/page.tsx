"use client"

// CAMADA 1 · TELA 8 (Minha rota do aluno). Só desenha e chama o hook. Moldura e barra vêm do StudentLayout.
import { Bus, Phone, RotateCcw } from "lucide-react"
import Link from "next/link"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"

import { EnrollmentCard, firstName } from "./enrollment-card"
import { OutboundCallSection } from "./outbound-call-section"
import { SingleTripSection } from "./single-trip-section"
import { useMyRoute } from "./use-my-route"

export default function MyRoutePage() {
  const { state, retry, drawer, open, close, submitting, drawerError, submit } = useMyRoute()

  const header = (subtitle?: string) => (
    <header className="flex flex-col gap-1">
      <span className="legenda text-muted-foreground">
        {state.status === "ready" || state.status === "empty" ? `Oi, ${state.firstName}` : "Sua vaga"}
      </span>
      <h1 className="titulo-tela">Minha rota</h1>
      {subtitle && <span className="corpo text-muted-foreground">{subtitle}</span>}
    </header>
  )

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Carregando">
        <Skeleton className="h-16" />
        <Skeleton className="h-[148px] rounded-xl" />
        <Skeleton className="h-[88px] rounded-xl" />
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <>
        {header()}
        <div className="flex flex-col gap-3">
          <Alert variant="destructive">
            <AlertDescription>Não foi possível carregar sua rota.</AlertDescription>
          </Alert>
          <Button variant="secondary" size="lg" onClick={retry}>
            Tentar de novo
          </Button>
        </div>
      </>
    )
  }

  if (state.status === "empty") {
    return (
      <>
        {header()}
        <SingleTripSection studentId={state.accountId} />
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center">
          <span aria-hidden="true" className="mb-1 flex size-12 items-center justify-center rounded-full bg-inverse text-inverse-foreground">
            <Bus className="size-5" />
          </span>
          <span className="titulo-card">Você ainda não tem vaga</span>
          <Button asChild className="mt-2">
            <Link href="/student/vans">Buscar vans</Link>
          </Button>
        </div>
      </>
    )
  }

  const { myRoute } = state

  return (
    <>
      {myRoute.kind === "confirmed" ? (
        <>
          {header(
            `${myRoute.enrollment.route.origin} → ${myRoute.enrollment.route.destination} · van de ${firstName(myRoute.enrollment.operatorName)}`,
          )}

          <OutboundCallSection studentId={state.accountId} />

          <Card>
            <CardContent className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5 rounded-sm bg-background px-3 py-2.5">
                <span className="legenda text-muted-foreground">Ida · {myRoute.enrollment.boardingPoint.name}</span>
                <span className="corpo-forte">{myRoute.enrollment.boardingPoint.time}</span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-sm bg-background px-3 py-2.5">
                <span className="legenda text-muted-foreground">Volta · Facens</span>
                <span className="corpo-forte">{myRoute.enrollment.route.returnTime}</span>
              </div>
            </CardContent>
            <CardContent className="apoio flex items-center gap-2 text-muted-foreground">
              <RotateCcw aria-hidden="true" className="size-4" />
              Volta da Facens às {myRoute.enrollment.route.returnTime}
            </CardContent>
          </Card>

          <Card role="region" aria-labelledby="driver-title">
            <CardContent className="flex items-center gap-3">
              <Avatar tone="highlight" aria-hidden="true">
                <AvatarFallback>{firstName(myRoute.enrollment.operatorName).charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h2 id="driver-title" className="legenda text-muted-foreground">
                  Motorista
                </h2>
                <span className="corpo-forte truncate">{firstName(myRoute.enrollment.operatorName)}</span>
                <span className="apoio text-muted-foreground">{myRoute.enrollment.operatorPhone}</span>
              </div>
              <Button asChild variant="secondary" size="sm">
                <a href={`tel:${myRoute.enrollment.operatorPhone.replace(/\D/g, "")}`}>
                  <Phone aria-hidden="true" />
                  Ligar
                </a>
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {header()}
          <ul className="flex flex-col gap-3">
            {myRoute.enrollments.map((enrollment) => (
              <li key={enrollment.id}>
                <EnrollmentCard
                  enrollment={enrollment}
                  onConfirm={() => open("confirm", enrollment)}
                  onWithdraw={() => open("withdraw", enrollment)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <SingleTripSection studentId={state.accountId} />

      <Drawer open={drawer !== null} onOpenChange={(isOpen) => !isOpen && close()}>
        {drawer && (
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>
                {drawer.action === "confirm" ? "Ficar com a van de" : "Desistir da van de"} {firstName(drawer.enrollment.operatorName)}?
              </DrawerTitle>
              <DrawerDescription>
                {drawer.action === "confirm" ? "Seus outros pedidos são cancelados." : "O lugar fica livre pra outro aluno."}
              </DrawerDescription>
            </DrawerHeader>
            {drawerError && (
              <Alert variant="destructive" className="mx-4 w-auto">
                <AlertDescription>{drawerError}</AlertDescription>
              </Alert>
            )}
            <DrawerFooter>
              <Button variant={drawer.action === "confirm" ? "default" : "destructive"} size="lg" disabled={submitting} onClick={submit}>
                {drawer.action === "confirm" ? "Ficar com esta van" : "Desistir"}
              </Button>
              <Button variant="ghost" size="lg" onClick={close}>
                Voltar
              </Button>
            </DrawerFooter>
          </DrawerContent>
        )}
      </Drawer>
    </>
  )
}
