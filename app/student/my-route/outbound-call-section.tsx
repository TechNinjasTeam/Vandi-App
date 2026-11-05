"use client"

// CAMADA 1 · chamada da ida na Tela 8 (Minha rota). Só desenha e chama o hook.
import { ArrowLeft, ArrowLeftRight, ArrowRight, Clock, X } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { OutboundCallAnswer } from "@/types"

import { useOutboundCall } from "./use-outbound-call"

const ANSWERS: { value: OutboundCallAnswer; label: string; Icon: typeof X }[] = [
  { value: "both", label: "Ida e volta", Icon: ArrowLeftRight },
  { value: "outbound_only", label: "Só a ida", Icon: ArrowRight },
  { value: "return_only", label: "Só a volta", Icon: ArrowLeft },
  { value: "none", label: "Não vou", Icon: X },
]

export function OutboundCallSection({ studentId }: { studentId: string }) {
  const { state, view, retry, answer, reclaim, submitting, writeError } = useOutboundCall(studentId)

  if (state.status === "loading") {
    return <Skeleton className="h-[148px] rounded-xl" role="status" aria-busy="true" aria-label="Carregando a chamada" />
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

  // Sem vaga fixa ou rota sem horário de ida: nada a responder
  if (state.status === "empty" || !view) return null

  const { call } = state
  const answered = ANSWERS.find((a) => a.value === view.current)
  const released = !call.response && (call.phase === "after_deadline" || call.phase === "after_reclaim")

  let title = `Você vai ${view.when}?`
  let line: string | null = null
  if (call.phase === "not_open") {
    title = `A chamada abre às ${view.opensAt}, ${view.opensDay}.`
  } else if (answered) {
    title = `Você respondeu: ${answered.label}.`
    line = "Dá para trocar até a saída."
  } else if (released) {
    title = "Você não respondeu. O lugar foi liberado."
    if (call.phase === "after_reclaim") line = "Prazo para recorrer encerrado."
  }

  return (
    <section aria-label="Chamada da ida" className="flex flex-col gap-4">
      <Card variant="destaque" className="px-5">
        <span className="legenda text-primary-foreground/80">Próxima ida · {view.dayLabel}</span>
        <h2 className="titulo-card">{title}</h2>
        {line && <p className="apoio text-primary-foreground/80">{line}</p>}
      </Card>

      {call.phase !== "not_open" && !released && (
        <div role="group" aria-label="Sua resposta" className="grid grid-cols-2 gap-2">
          {ANSWERS.map(({ value, label, Icon }) => {
            const pressed = view.current === value
            return (
              <button
                key={value}
                type="button"
                aria-pressed={pressed}
                disabled={submitting}
                onClick={() => answer(value)}
                className={cn(
                  "flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 font-display text-[17px] font-bold disabled:opacity-60",
                  !pressed && "border-border bg-card text-card-foreground",
                  pressed && value !== "none" && "border-volto bg-volto text-volto-foreground",
                  pressed && value === "none" && "border-nao-volto bg-nao-volto text-nao-volto-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-6" />
                {label}
              </button>
            )
          })}
        </div>
      )}

      {released && call.phase === "after_deadline" && (
        <Button size="lg" disabled={submitting} onClick={reclaim}>
          Recorrer à vaga
        </Button>
      )}

      {writeError && (
        <Alert variant="destructive">
          <AlertDescription>{writeError}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-dashed border-sem-resposta-border p-3">
        <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p className="apoio">
          Responda até {view.answerBy}. Quem não responde fica sem crédito e o lugar vai para a venda. Dá para recorrer à vaga até{" "}
          {view.reclaimUntil}.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-0.5">
          <span className="corpo-forte">Seu crédito: {view.credit}</span>
          <span className="apoio text-muted-foreground">Fica guardado como crédito.</span>
        </CardContent>
      </Card>
    </section>
  )
}
