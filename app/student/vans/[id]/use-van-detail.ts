"use client"

// CAMADA 2 · HOOK da Tela 7 (Ver a van e pedir vaga). Só guarda o estado e chama os services.
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

import { getNow } from "@/services/clock"
import { requestSeat } from "@/services/enrollments"
import { formatMonthlyPrice, formatWeekdays } from "@/services/routes"
import { getCurrentAccount } from "@/services/session"
import { getVan } from "@/services/vans"
import type { VanDetail } from "@/types"

type VanDetailState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "not_found" }
  | { status: "ready"; van: VanDetail; operatorFirstName: string; daysLabel: string; priceLabel: string }

function load(id: string): Promise<VanDetailState> {
  return getCurrentAccount()
    .then(async (account): Promise<VanDetailState> => {
      if (!account) throw new Error("no session")
      const van = await getVan(id, account.id)
      if (!van) return { status: "not_found" }
      return {
        status: "ready",
        van,
        operatorFirstName: van.operatorName.trim().split(/\s+/)[0],
        daysLabel: formatWeekdays(van.weekdays),
        priceLabel: formatMonthlyPrice(van.monthlyPrice),
      }
    })
    .catch((): VanDetailState => ({ status: "error" }))
}

export function useVanDetail() {
  const { id } = useParams<{ id: string }>()
  const [state, setState] = useState<VanDetailState>({ status: "loading" })
  const [pointId, setPointId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Com cacheComponents a rota vive em <Activity>: este efeito roda de novo cada vez que a tela volta a aparecer,
  // e é isso que mostra "Você já pediu vaga aqui" depois de pedir e voltar. O cleanup zera o que a visita anterior deixou.
  // setState só dentro do .then: regra react-hooks/set-state-in-effect
  useEffect(() => {
    let active = true
    load(id).then((next) => {
      if (active) setState(next)
    })
    return () => {
      active = false
      setState({ status: "loading" })
      setPointId(null)
      setSent(false)
      setSubmitError(null)
    }
  }, [id])

  // "Tentar de novo": em handler, setState direto é permitido
  function retry() {
    setState({ status: "loading" })
    load(id).then(setState)
  }

  async function request() {
    if (!pointId || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const account = await getCurrentAccount()
      if (!account) throw new Error("no session")
      const result = await requestSeat(account.id, id, pointId, getNow())
      if (result.ok) setSent(true)
      else setSubmitError(result.error)
    } catch {
      setSubmitError("Não deu pra salvar. Tenta de novo.")
    } finally {
      setSubmitting(false)
    }
  }

  return { state, retry, pointId, setPointId, submitting, sent, submitError, request }
}
