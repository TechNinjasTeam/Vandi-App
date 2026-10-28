"use client"

// CAMADA 1 · TELA 7 (Ver a van e pedir vaga). Só desenha e chama o hook.
import Link from "next/link"
import { Clock } from "lucide-react"

import { BackHeader } from "@/components/back-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupCard } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"

import { useVanDetail } from "./use-van-detail"

export default function VanDetailPage() {
  const { state, retry, pointId, setPointId, submitting, sent, submitError, request } = useVanDetail()

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Carregando">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-[148px] rounded-xl" />
        <Skeleton className="h-[148px] rounded-xl" />
      </div>
    )
  }

  if (state.status === "error" || state.status === "not_found") {
    return (
      <div className="flex flex-col gap-3">
        <Alert variant="destructive">
          <AlertDescription>
            {state.status === "error" ? "Não foi possível carregar a van." : "Não achamos essa van."}
          </AlertDescription>
        </Alert>
        {state.status === "error" && (
          <Button variant="secondary" size="lg" onClick={retry}>
            Tentar de novo
          </Button>
        )}
        <Button asChild size="lg" variant={state.status === "error" ? "ghost" : "default"}>
          <Link href="/student/vans">Voltar para a busca</Link>
        </Button>
      </div>
    )
  }

  const { van, operatorFirstName, daysLabel, priceLabel } = state
  const point = van.boardingPoints.find((p) => p.id === pointId)
  const blocked = van.hasConfirmedSeat || van.hasActiveRequest || van.full
  const cells = [
    { label: "Volta", value: van.returnTime },
    { label: "Por mês", value: priceLabel },
    { label: "Livres", value: `${van.freeSeats} de ${van.seats}` },
  ]
  const buttonLabel = van.hasConfirmedSeat
    ? "Você já tem vaga fixa"
    : van.hasActiveRequest
      ? "Você já pediu vaga aqui"
      : van.full
        ? "Van lotada"
        : point
          ? `Pedir vaga · ${point.name}`
          : "Escolha um ponto pra pedir vaga"

  return (
    <>
      <BackHeader
        title={`${van.origin} → ${van.destination}`}
        description={daysLabel}
        href="/student/vans"
        label="Voltar para a busca"
      />

      <Card role="region" aria-label="Operador" className="gap-4 px-4">
        <div className="flex items-center gap-3">
          <Avatar size="lg" tone="highlight" aria-hidden="true">
            <AvatarFallback>{operatorFirstName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <span className="legenda text-muted-foreground">Van de</span>
            <span className="titulo-card">{operatorFirstName}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {cells.map((cell) => (
            <div key={cell.label} className="flex flex-col gap-0.5 rounded-sm bg-background px-3 py-2.5">
              <span className="legenda text-muted-foreground">{cell.label}</span>
              <span className="corpo-forte">{cell.value}</span>
            </div>
          ))}
        </div>
        <span className="legenda text-muted-foreground">
          O pagamento é combinado direto com {operatorFirstName}, fora do app.
        </span>
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="points-title" className="titulo-card">
            Onde você embarca?
          </h2>
          <p className="apoio text-muted-foreground">
            Pontos na ordem da rota. O horário é a passagem da van na ida.
          </p>
        </div>
        <RadioGroup
          aria-labelledby="points-title"
          value={pointId ?? ""}
          onValueChange={setPointId}
          disabled={sent || blocked}
        >
          {van.boardingPoints.map((p) => (
            <RadioGroupCard
              key={p.id}
              value={p.id}
              className={sent && p.id !== pointId ? "min-h-[68px] opacity-55" : "min-h-[68px]"}
            >
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="corpo-forte">{p.name}</span>
                <span className="apoio text-muted-foreground">Ponto {p.order}</span>
              </span>
              <span className="titulo-card">{p.time}</span>
            </RadioGroupCard>
          ))}
        </RadioGroup>
      </section>

      {sent && (
        <Card role="status" className="flex-row items-start gap-3 border border-dashed border-input px-4">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-inverse text-inverse-foreground"
          >
            <Clock className="size-5" />
          </span>
          <span className="flex flex-1 flex-col gap-1">
            <span className="corpo-forte">Pedido enviado</span>
            <span className="apoio text-muted-foreground">
              Aguardando o motorista aceitar. Você acompanha em Minha rota.
            </span>
          </span>
        </Card>
      )}

      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {sent ? (
        <Button asChild size="lg" variant="secondary" className="w-full">
          <Link href="/student/my-route">Ver Minha rota</Link>
        </Button>
      ) : (
        <Button size="lg" className="w-full" disabled={blocked || !point || submitting} onClick={request}>
          {buttonLabel}
        </Button>
      )}
    </>
  )
}
