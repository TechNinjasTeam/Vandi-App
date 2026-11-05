"use client"

// CAMADA 2 · HOOK da chamada da ida na Tela 8. Só guarda o estado e chama os services.
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { formatShortDay, getNow, getToday } from "@/services/clock"
import { formatMoney } from "@/services/dashboard"
import { answerOutboundCall, getCredit, getOutboundCall, reclaimSeat } from "@/services/outbound-call"
import type { OutboundCall, OutboundCallAnswer, Result } from "@/types"

type OutboundCallState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ready"; call: OutboundCall; credit: number }

function load(studentId: string): Promise<OutboundCallState> {
  return Promise.all([getOutboundCall(studentId, getNow()), getCredit(studentId)])
    .then(([call, credit]): OutboundCallState => (call ? { status: "ready", call, credit } : { status: "empty" }))
    .catch((): OutboundCallState => ({ status: "error" }))
}

function toAnswer(response: OutboundCall["response"]): OutboundCallAnswer | null {
  if (!response) return null
  if (response.outbound && response.return) return "both"
  if (response.outbound) return "outbound_only"
  return response.return ? "return_only" : "none"
}

export function useOutboundCall(studentId: string) {
  const [state, setState] = useState<OutboundCallState>({ status: "loading" })
  const [submitting, setSubmitting] = useState(false)
  const [writeError, setWriteError] = useState<string | null>(null)

  // Mesmo molde de use-operator-home: setState só no .then; o cleanup volta a "loading" pra não mostrar,
  // no 1º quadro, a chamada da conta anterior; `active` descarta carga atrasada.
  useEffect(() => {
    let active = true
    load(studentId).then((next) => {
      if (active) setState(next)
    })
    return () => {
      active = false
      setState({ status: "loading" })
    }
  }, [studentId])

  // "Tentar de novo": em handler, setState direto é permitido
  function retry() {
    setState({ status: "loading" })
    load(studentId).then(setState)
  }

  // O service decide pelo relógio no toque, não pela fase mostrada. Recarrega depois de toda gravação,
  // também a que falhou: a fase pode ter virado com a tela aberta.
  async function write(run: (call: OutboundCall) => Promise<Result<unknown>>, done?: string) {
    if (state.status !== "ready") return
    setSubmitting(true)
    setWriteError(null)
    const result = await run(state.call)
    setSubmitting(false)
    if (result.ok) {
      if (done) toast.success(done)
    } else {
      setWriteError(result.error)
    }
    load(studentId).then(setState)
  }

  const answer = (a: OutboundCallAnswer) => write((call) => answerOutboundCall(studentId, call.routeId, a, getNow()))
  const reclaim = () => write((call) => reclaimSeat(studentId, call.routeId, getNow()), "Sua vaga está de volta.")

  const view =
    state.status === "ready"
      ? {
          current: toAnswer(state.call.response),
          opensAt: state.call.opensAt.slice(11, 16),
          opensDay: formatShortDay(state.call.opensAt.slice(0, 10)),
          answerBy: state.call.answerBy.slice(11, 16),
          reclaimUntil: state.call.reclaimUntil.slice(11, 16),
          dayLabel: formatShortDay(state.call.date),
          when: state.call.date === getToday() ? "hoje" : "amanhã",
          credit: formatMoney(state.credit),
        }
      : null

  return { state, view, retry, answer, reclaim, submitting, writeError }
}
