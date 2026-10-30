"use client"

// CAMADA 1 · TELA 9 (Lista de embarque). Só desenha e chama o hook. Moldura e barra vêm do OperatorLayout.
import { Inbox } from "lucide-react"
import Link from "next/link"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { BackHeader } from "@/components/back-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Passenger, TripDirection } from "@/types"

import { PassengerRow } from "./passenger-row"
import { SellSeatsDrawer } from "./sell-seats-drawer"
import { useBoardingList } from "./use-boarding-list"

function EmptyCard({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center">
      <span aria-hidden="true" className="mb-1 flex size-12 items-center justify-center rounded-full bg-inverse text-inverse-foreground">
        <Inbox className="size-5" />
      </span>
      <span className="titulo-card">{title}</span>
      {description && <span className="apoio max-w-[280px] text-muted-foreground">{description}</span>}
      {children}
    </div>
  )
}

function Rows({ passengers, group }: { passengers: Passenger[]; group: "going" | "notGoing" | "noResponse" }) {
  return (
    <Card className="gap-0 px-4 py-1">
      {passengers.map((passenger, i) => (
        <div key={passenger.studentId} className={i < passengers.length - 1 ? "border-b border-border" : undefined}>
          <PassengerRow passenger={passenger} group={group} />
        </div>
      ))}
    </Card>
  )
}

export default function BoardingListPage() {
  const { state, retry, select, setLeg, reload } = useBoardingList()

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Carregando">
        <Skeleton className="h-24" />
        <Skeleton className="h-11 rounded-full" />
        <Skeleton className="h-[150px] rounded-xl" />
        <Skeleton className="h-[200px] rounded-xl" />
        <Skeleton className="h-[200px] rounded-xl" />
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

  const { list, routes, leg, dayLabel, operatorId } = state

  if (!list) {
    return (
      <>
        <BackHeader title="Lista de embarque" href="/operator" label="Voltar para o Início" />
        <EmptyCard title="Você ainda não tem rota" description="Crie a primeira para os alunos acharem a sua van e pedirem vaga.">
          <Button asChild className="mt-2">
            <Link href="/operator/new-route">Criar rota</Link>
          </Button>
        </EmptyCard>
      </>
    )
  }

  const { route, balance } = list
  const legBalance = leg === "outbound" ? balance.outbound : balance.return
  const leftover = Math.max(0, legBalance.leftover)
  const goingCount = list.going.reduce((sum, point) => sum + point.passengers.length, 0)
  const isEmpty = goingCount === 0 && list.notGoing.length === 0 && list.noResponse.length === 0

  return (
    <>
      <BackHeader
        title="Lista de embarque"
        description={`Próxima ida · ${dayLabel} · ${route.origin} → ${route.destination}`}
        href="/operator"
        label="Voltar para o Início"
      />

      {routes.length > 1 && (
        <Tabs value={route.id} onValueChange={select}>
          <TabsList aria-label="Rota">
            {routes.map((r) => (
              <TabsTrigger key={r.id} value={r.id}>
                {r.origin} → {r.destination}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <Tabs value={leg} onValueChange={(value) => setLeg(value as TripDirection)}>
        <TabsList aria-label="Trecho">
          <TabsTrigger value="outbound">Ida</TabsTrigger>
          <TabsTrigger value="return">Volta</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card variant="destaque" role="region" aria-label="Resumo do trecho" className="px-5">
        <h2 className="numero-grande">
          Vão {legBalance.going + legBalance.sold} de {balance.seats}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="highlight">Sai às {leg === "outbound" ? route.outboundTime : route.returnTime}</Badge>
          <Badge className="bg-card text-card-foreground">
            {legBalance.sold} {legBalance.sold === 1 ? "avulso" : "avulsos"}
          </Badge>
          <Badge variant="highlight">
            {leftover} {leftover === 1 ? "lugar sobrando" : "lugares sobrando"}
          </Badge>
        </div>
      </Card>

      <SellSeatsDrawer operatorId={operatorId} route={route} balance={balance} onAnnounced={reload} />

      {isEmpty && <EmptyCard title="Ninguém nesta viagem ainda." />}

      {goingCount > 0 && (
        <section aria-labelledby="going-title" className="flex flex-col gap-3">
          <h2 id="going-title" className="titulo-card">
            Vou · {goingCount}
          </h2>
          {list.going.map(({ boardingPoint, passengers }) => {
            const singles = passengers.filter((p) => p.kind === "single").length
            return (
              <div key={boardingPoint.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="legenda flex size-7 flex-none items-center justify-center rounded-full bg-highlight text-highlight-foreground">
                    {boardingPoint.order}
                  </span>
                  <h3 className="titulo-card min-w-0 flex-1 truncate">{boardingPoint.name}</h3>
                  <span className="corpo-forte">{boardingPoint.time}</span>
                </div>
                <Rows passengers={passengers} group="going" />
                <p className="legenda text-muted-foreground">
                  {passengers.length} neste ponto
                  {singles > 0 && ` · ${singles} ${singles === 1 ? "avulso" : "avulsos"}`}
                </p>
              </div>
            )
          })}
        </section>
      )}

      {list.notGoing.length > 0 && (
        <section aria-labelledby="not-going-title" className="flex flex-col gap-3">
          <h2 id="not-going-title" className="titulo-card">
            Não vou · {list.notGoing.length}
          </h2>
          <Rows passengers={list.notGoing} group="notGoing" />
        </section>
      )}

      {list.noResponse.length > 0 && (
        <section aria-labelledby="no-response-title" className="flex flex-col gap-3">
          <h2 id="no-response-title" className="titulo-card">
            Sem resposta · {list.noResponse.length}
          </h2>
          <Rows passengers={list.noResponse} group="noResponse" />
        </section>
      )}
    </>
  )
}
