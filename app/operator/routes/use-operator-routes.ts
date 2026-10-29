"use client"

// CAMADA 2 · HOOK de Minha rota do operador. Só guarda o estado e chama os services.
import { useEffect, useState } from "react"

import { formatMonthlyPrice, formatWeekdays, listOperatorRoutes } from "@/services/routes"
import { getCurrentAccount } from "@/services/session"
import type { OperatorRoute } from "@/types"

type OperatorRoutesState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready"
      routes: { route: OperatorRoute; daysLabel: string; priceLabel: string; pointsLabel: string }[]
    }

function pointsLabelOf({ boardingPoints }: OperatorRoute): string {
  const names = boardingPoints.map((p) => p.name).join(" · ")
  return `${boardingPoints.length} ${boardingPoints.length === 1 ? "ponto" : "pontos"}: ${names}`
}

function load(): Promise<OperatorRoutesState> {
  return getCurrentAccount()
    .then(async (account): Promise<OperatorRoutesState> => {
      if (!account) throw new Error("no session")
      const routes = await listOperatorRoutes(account.id)
      return {
        status: "ready",
        routes: routes.map((route) => ({
          route,
          daysLabel: formatWeekdays(route.weekdays),
          priceLabel: formatMonthlyPrice(route.monthlyPrice),
          pointsLabel: pointsLabelOf(route),
        })),
      }
    })
    .catch((): OperatorRoutesState => ({ status: "error" }))
}

export function useOperatorRoutes() {
  const [state, setState] = useState<OperatorRoutesState>({ status: "loading" })

  // Reload-on-show (mesmo padrão de use-operator-home.ts): com <Activity> o efeito roda de novo a cada volta à tela,
  // e é isso que mostra a rota recém-criada ou editada. O cleanup volta a "loading" e `active` descarta carga atrasada.
  useEffect(() => {
    let active = true
    load().then((next) => {
      if (active) setState(next)
    })
    return () => {
      active = false
      setState({ status: "loading" })
    }
  }, [])

  // "Tentar de novo": em handler, setState direto é permitido
  function retry() {
    setState({ status: "loading" })
    load().then(setState)
  }

  return { state, retry }
}
