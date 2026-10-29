"use client"

// CAMADA 1 · TELA 12 (Desempenho). Só desenha e chama o hook. Moldura e barra vêm do OperatorLayout.
import { ChartColumn, Info } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { AbsenceChart } from "./absence-chart"
import { TrendBadge } from "./trend-badge"
import { useDashboard } from "./use-dashboard"
import { WeeklyOccupancyChart } from "./weekly-occupancy-chart"

function Header({ caption }: { caption: string }) {
  return (
    <header className="flex flex-col gap-1">
      <span className="legenda text-muted-foreground">{caption}</span>
      <h1 className="titulo-tela">Desempenho</h1>
      <Badge variant="aviso" className="mt-1">
        <Info aria-hidden="true" />
        Dados de demonstração
      </Badge>
    </header>
  )
}

export default function DashboardPage() {
  const { state, filter, selectFilter, selectedWeek, selectWeek, retry } = useDashboard()

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Carregando">
        <Skeleton className="h-16" />
        <Skeleton className="h-11 rounded-full" />
        <Skeleton className="h-[208px] rounded-xl" />
        <Skeleton className="h-[232px] rounded-xl" />
        <Skeleton className="h-[184px] rounded-xl" />
        <Skeleton className="h-[372px] rounded-xl" />
        <Skeleton className="h-[328px] rounded-xl" />
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-3">
        <Alert variant="destructive">
          <AlertDescription>Não deu pra carregar o painel.</AlertDescription>
        </Alert>
        <Button variant="secondary" size="lg" onClick={retry}>
          Tentar de novo
        </Button>
      </div>
    )
  }

  if (state.status === "empty") {
    return (
      <>
        <Header caption={state.caption} />
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center">
          <span aria-hidden="true" className="mb-1 flex size-12 items-center justify-center rounded-full bg-inverse text-inverse-foreground">
            <ChartColumn className="size-5" />
          </span>
          <span className="titulo-card">Ainda não há viagens para mostrar.</span>
        </div>
      </>
    )
  }

  const { view } = state

  return (
    <>
      <Header caption={view.caption} />

      {view.tabs.length > 0 && (
        <Tabs value={filter} onValueChange={selectFilter}>
          <TabsList>
            {view.tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <Card variant="destaque" role="region" aria-labelledby="occupancy-title" className="items-start px-5">
        <h2 id="occupancy-title" className="apoio text-primary-foreground/80">
          Lugares ocupados na ida
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="numero-grande">{view.occupancy.occupied}</span>
          <span className="corpo-forte">de {view.occupancy.seats}</span>
        </div>
        <p className="corpo-forte">A van foi {view.occupancy.percent} cheia</p>
        <TrendBadge trend={view.occupancy.trend} />
        <p className="apoio text-primary-foreground/80">{view.occupancy.previous}</p>
      </Card>

      <Card role="region" aria-labelledby="leftover-title">
        <div className="flex flex-col gap-1 px-4">
          <h2 id="leftover-title" className="titulo-card">
            Lugares que sobraram
          </h2>
          <p className="apoio text-muted-foreground">Lugares sem aluno fixo. Você pode vender como avulso.</p>
        </div>
        <div className="flex items-baseline gap-2 px-4">
          <span className="numero-grande">
            {view.leftover.sold} de {view.leftover.leftover}
          </span>
          <span className="corpo-forte">vendidos</span>
        </div>
        <div
          role="img"
          aria-label={`${view.leftover.sold} vendidos como avulso, ${view.leftover.empty} foram vazios`}
          className="mx-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-chart-4"
        >
          <span className="bg-chart-2" style={{ flexGrow: view.leftover.bar.sold }} />
          <span className="bg-chart-4" style={{ flexGrow: view.leftover.bar.empty }} />
        </div>
        <div className="legenda flex flex-wrap gap-x-3.5 gap-y-1 px-4 text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 rounded-[4px] bg-chart-2" />
            {view.leftover.sold} vendidos como avulso
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 rounded-[4px] bg-chart-4" />
            {view.leftover.empty} foram vazios
          </span>
        </div>
        <div className="flex flex-col items-start gap-3 px-4">
          <TrendBadge trend={view.leftover.trend} />
          <p className="apoio">{view.leftover.previous}</p>
        </div>
      </Card>

      <Card role="region" aria-labelledby="earnings-title">
        <h2 id="earnings-title" className="titulo-card px-4">
          Dinheiro dos avulsos
        </h2>
        <span className="numero-grande px-4">{view.earnings.value}</span>
        <p className="apoio px-4 text-muted-foreground">O que você recebeu pelos lugares vendidos nesta semana.</p>
        <div className="flex items-center gap-2 px-4">
          <TrendBadge trend={view.earnings.trend} />
          <span className="apoio">{view.earnings.previous}</span>
        </div>
      </Card>

      <WeeklyOccupancyChart weeks={view.weeks} selected={selectedWeek} onSelect={selectWeek} />
      <AbsenceChart days={view.absenceDays} phrase={view.peakPhrase} />

      <p className="legenda text-muted-foreground">
        Ocupado quer dizer que o aluno não avisou falta. O app não confere quem subiu na van.
      </p>
    </>
  )
}
