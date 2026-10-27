"use client"

// CAMADA 2 · HOOK da Tela 3 (Início do operador). Só guarda o estado e chama os services.
import { useEffect, useState } from "react"

import { formatDayCaption, getToday } from "@/services/clock"
import { countPendingRequests } from "@/services/enrollments"
import { formatWeekdays, listOperatorRoutes } from "@/services/routes"
import { getCurrentAccount } from "@/services/session"
import type { OperatorRoute } from "@/types"

type OperatorHomeState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready"
      caption: string
      firstName: string
      pendingRequests: number
      routes: { route: OperatorRoute; daysLabel: string }[]
    }

function load(): Promise<OperatorHomeState> {
  return getCurrentAccount()
    .then(async (account): Promise<OperatorHomeState> => {
      if (!account) throw new Error("no session")
      const [routes, pendingRequests] = await Promise.all([listOperatorRoutes(account.id), countPendingRequests(account.id)])
      return {
        status: "ready",
        caption: formatDayCaption(getToday()),
        firstName: account.name.trim().split(/\s+/)[0],
        pendingRequests,
        routes: routes.map((route) => ({ route, daysLabel: formatWeekdays(route.weekdays) })),
      }
    })
    .catch((): OperatorHomeState => ({ status: "error" }))
}

export function useOperatorHome() {
  const [state, setState] = useState<OperatorHomeState>({ status: "loading" })

  // Com cacheComponents a rota vive em <Activity>: este efeito roda de novo cada vez que a tela volta a aparecer,
  // e é isso que lista a rota criada na Tela 4. Sem ref de "só na montagem".
  // setState só dentro do .then: regra react-hooks/set-state-in-effect
  // O cleanup roda quando a rota é escondida: volta a "loading" pra não mostrar, no 1º quadro ao reaparecer,
  // os dados da conta anterior. `active` descarta carga que termina depois de escondida.
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
