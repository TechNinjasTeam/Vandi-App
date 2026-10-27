"use client"

// CAMADA 1 · TELA 3 (Início do operador). Só desenha e chama o hook. Moldura e barra vêm do OperatorLayout.
import { ArrowRight, Bus, ChartColumn, ClipboardList, Plus, type LucideIcon } from "lucide-react"
import Link from "next/link"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { RouteCard } from "./route-card"
import { useOperatorHome } from "./use-operator-home"

const TONES = {
  highlight: "bg-highlight text-highlight-foreground",
  secondary: "bg-secondary text-secondary-foreground",
}

// "Em breve": destino que ainda não existe. Não navega (DEC-051); #5, #6 e #9 trocam por link.
function ComingSoonCard({ icon: Icon, title, tone }: { icon: LucideIcon; title: string; tone: keyof typeof TONES }) {
  return (
    <button
      type="button"
      aria-disabled="true"
      className="flex min-h-[68px] w-full items-center gap-3 rounded-xl bg-card px-4 py-3.5 text-left shadow-card"
    >
      <span aria-hidden="true" className={`flex size-10 flex-none items-center justify-center rounded-full ${TONES[tone]}`}>
        <Icon className="size-5" />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="corpo-forte">{title}</span>
        <span className="apoio text-muted-foreground">Em breve</span>
      </span>
    </button>
  )
}

export default function OperatorHomePage() {
  const { state, retry } = useOperatorHome()

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Carregando">
        <Skeleton className="h-14" />
        <Skeleton className="h-[174px] rounded-xl" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[172px] rounded-xl" />
          <Skeleton className="h-[172px] rounded-xl" />
        </div>
        <Skeleton className="h-[68px] rounded-xl" />
        <Skeleton className="h-[68px] rounded-xl" />
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

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="legenda text-muted-foreground">{state.caption}</span>
          <h1 className="titulo-tela">Bom dia, {state.firstName}</h1>
        </div>
        <Avatar tone="highlight" role="img" aria-label={state.firstName}>
          <AvatarFallback>{state.firstName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </header>

      <Card variant="destaque" role="region" aria-labelledby="requests-title" className="px-5">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="requests-title" className="apoio text-primary-foreground/80">
              Pedidos de vaga
            </h2>
            <div className="flex items-baseline gap-2">
              <span className="numero-grande">{state.pendingRequests}</span>
              <span className="corpo-forte">esperando você</span>
            </div>
          </div>
          <span aria-hidden="true" className="mb-2.5 size-3 rounded-full bg-highlight" />
        </div>
        <Button type="button" aria-disabled="true" size="lg" className="w-full bg-card text-secondary-foreground hover:bg-card">
          Ver pedidos
          <ArrowRight aria-hidden="true" />
        </Button>
        <span className="apoio text-center text-primary-foreground/80">Em breve</span>
      </Card>

      <section aria-labelledby="routes-title" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="routes-title" className="titulo-card">
            Minhas rotas
          </h2>
          <Button asChild variant="ghost" size="sm" className="-mr-3">
            <Link href="/operator/new-route">
              <Plus aria-hidden="true" />
              Criar rota
            </Link>
          </Button>
        </div>
        {state.routes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center">
            <span aria-hidden="true" className="mb-1 flex size-12 items-center justify-center rounded-full bg-inverse text-inverse-foreground">
              <Bus className="size-5" />
            </span>
            <span className="titulo-card">Você ainda não tem rotas</span>
            <span className="apoio max-w-[280px] text-muted-foreground">Crie a primeira para os alunos acharem a sua van.</span>
            <Button asChild className="mt-2">
              <Link href="/operator/new-route">Criar rota</Link>
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {state.routes.map(({ route, daysLabel }) => (
              <li key={route.id}>
                <RouteCard route={route} daysLabel={daysLabel} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="trips-title" className="flex flex-col gap-3">
        <h2 id="trips-title" className="titulo-card">
          Viagens
        </h2>
        <ComingSoonCard icon={ClipboardList} tone="highlight" title="Lista de embarque de amanhã" />
      </section>

      <section aria-labelledby="management-title" className="flex flex-col gap-3">
        <h2 id="management-title" className="titulo-card">
          Gestão
        </h2>
        <ComingSoonCard icon={ChartColumn} tone="secondary" title="Ver painel" />
      </section>
    </>
  )
}
