"use client"

// CAMADA 2 · HOOK da Tela 9 (Lista de embarque). Só guarda o estado e chama os services.
import { useEffect, useState } from "react"

import { getBoardingList } from "@/services/boarding-list"
import { formatShortDay, getNow } from "@/services/clock"
import { listOperatorRoutes } from "@/services/routes"
import { getCurrentAccount } from "@/services/session"
import type { BoardingList, OperatorRoute, TripDirection } from "@/types"

type BoardingListState =
  | { status: "loading" }
  | { status: "error" }
  // list = null: o operador ainda não tem rota
  | { status: "ready"; operatorId: string; routes: OperatorRoute[]; leg: TripDirection; list: BoardingList | null; dayLabel: string }

function load(routeId: string | null, leg: TripDirection): Promise<BoardingListState> {
  return getCurrentAccount()
    .then(async (account): Promise<BoardingListState> => {
      if (!account) throw new Error("no session")
      const routes = await listOperatorRoutes(account.id)
      const current = routes.find((r) => r.id === routeId) ?? routes[0]
      if (!current) return { status: "ready", operatorId: account.id, routes, leg, list: null, dayLabel: "" }
      const list = await getBoardingList(account.id, current.id, leg, getNow())
      if (!list) throw new Error("route not found")
      return { status: "ready", operatorId: account.id, routes, leg, list, dayLabel: formatShortDay(list.date) }
    })
    .catch((): BoardingListState => ({ status: "error" }))
}

export function useBoardingList() {
  const [state, setState] = useState<BoardingListState>({ status: "loading" })

  // Com cacheComponents a rota vive em <Activity>: o efeito roda de novo cada vez que a tela volta a aparecer.
  // setState só dentro do .then: regra react-hooks/set-state-in-effect
  // O cleanup volta a "loading" pra não mostrar, ao reaparecer, a lista da conta anterior.
  useEffect(() => {
    let active = true
    load(null, "outbound").then((next) => {
      if (active) setState(next)
    })
    return () => {
      active = false
      setState({ status: "loading" })
    }
  }, [])

  // Handlers: setState direto é permitido
  function retry() {
    setState({ status: "loading" })
    load(null, "outbound").then(setState)
  }

  function go(routeId: string | null, leg: TripDirection) {
    load(routeId, leg).then(setState)
  }

  const ready = state.status === "ready" ? state : null

  return {
    state,
    retry,
    select: (routeId: string) => go(routeId, ready?.leg ?? "outbound"),
    setLeg: (leg: TripDirection) => go(ready?.list?.route.id ?? null, leg),
    reload: () => go(ready?.list?.route.id ?? null, ready?.leg ?? "outbound"),
  }
}
