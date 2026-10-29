"use client"

// CAMADA 1 · TELA 5 (Pedidos de vaga). Só desenha e chama o hook. Moldura e barra vêm do OperatorLayout.
import { Inbox } from "lucide-react"
import Link from "next/link"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { RequestCard } from "./request-card"
import { useSeatRequests } from "./use-seat-requests"

function EmptyCard({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center">
      <span aria-hidden="true" className="mb-1 flex size-12 items-center justify-center rounded-full bg-inverse text-inverse-foreground">
        <Inbox className="size-5" />
      </span>
      <span className="titulo-card">{title}</span>
      <span className="apoio max-w-[280px] text-muted-foreground">{description}</span>
      {children}
    </div>
  )
}

export default function SeatRequestsPage() {
  const { state, deciding, retry, select, accept, decline, dayLabel } = useSeatRequests()

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Carregando">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-[110px] rounded-xl" />
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

  const current = state.routes.find((r) => r.route.id === state.selectedRouteId)

  if (!current) {
    return (
      <>
        <h1 className="titulo-tela">Pedidos de vaga</h1>
        <EmptyCard title="Você ainda não tem rota" description="Crie a primeira para os alunos acharem a sua van e pedirem vaga.">
          <Button asChild className="mt-2">
            <Link href="/operator/new-route">Criar rota</Link>
          </Button>
        </EmptyCard>
      </>
    )
  }

  const { route, requested, accepted } = current
  const free = Math.max(route.seats - route.occupiedSeats, 0)
  const count = requested.length

  return (
    <>
      <h1 className="titulo-tela">Pedidos de vaga</h1>

      {state.routes.length > 1 && (
        <Tabs value={route.id} onValueChange={select}>
          <TabsList aria-label="Rota">
            {state.routes.map((r) => (
              <TabsTrigger key={r.route.id} value={r.route.id}>
                {r.route.origin} → {r.route.destination}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <Card role="region" aria-label="Lugares" className="gap-2.5 px-4">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="numero-grande">{free}</span>
            <span className="corpo-forte">{free === 1 ? "lugar sobrando" : "lugares sobrando"}</span>
          </div>
          <span className="apoio text-muted-foreground">
            {route.occupiedSeats} de {route.seats} ocupados
          </span>
        </div>
        <Progress value={Math.round((route.occupiedSeats / route.seats) * 100)} aria-label="Lugares ocupados" />
      </Card>

      <section aria-labelledby="requests-title" className="flex flex-col gap-3">
        <h2 id="requests-title" className="titulo-card">
          {count === 0 ? "Pedidos" : count === 1 ? "1 pedido esperando" : `${count} pedidos esperando`}
        </h2>
        {count === 0 ? (
          <EmptyCard title="Nenhum pedido esperando" description="Quando um aluno pedir vaga nesta rota, o pedido aparece aqui." />
        ) : (
          <ul className="flex flex-col gap-3">
            {requested.map((request) => (
              <li key={request.id}>
                <RequestCard
                  request={request}
                  dayLabel={dayLabel(request)}
                  onAccept={() => accept(request)}
                  onDecline={() => decline(request)}
                  disabled={deciding !== null}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {accepted.length > 0 && (
        <section aria-labelledby="accepted-title" className="flex flex-col gap-3">
          <h2 id="accepted-title" className="titulo-card">
            Esperando o aluno confirmar
          </h2>
          <ul className="flex flex-col gap-3">
            {accepted.map((request) => (
              <li key={request.id}>
                <RequestCard request={request} dayLabel={dayLabel(request)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
