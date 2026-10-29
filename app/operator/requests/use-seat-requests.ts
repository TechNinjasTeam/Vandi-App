"use client"

// CAMADA 2 · HOOK da Tela 5 (Pedidos de vaga). Só guarda o estado e chama os services.
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { notifyPendingRequestsChanged } from "@/hooks/use-area-layout"
import { formatShortDay } from "@/services/clock"
import { acceptRequest, declineRequest, listRequests } from "@/services/requests"
import { getCurrentAccount } from "@/services/session"
import type { Enrollment, Result, RouteRequests, SeatRequest } from "@/types"

type SeatRequestsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; routes: RouteRequests[]; selectedRouteId: string | null }

// null = erro de leitura
function load(): Promise<RouteRequests[] | null> {
  return getCurrentAccount()
    .then((account) => {
      if (!account) throw new Error("no session")
      return listRequests(account.id)
    })
    .catch(() => null)
}

// Mantém a aba escolhida entre recargas; na primeira carga abre a primeira rota com pedido.
function toState(prev: SeatRequestsState, routes: RouteRequests[] | null): SeatRequestsState {
  if (!routes) return { status: "error" }
  const kept = prev.status === "ready" && routes.some((r) => r.route.id === prev.selectedRouteId)
  const first = routes.find((r) => r.requested.length > 0) ?? routes[0]
  return { status: "ready", routes, selectedRouteId: kept ? prev.selectedRouteId : (first?.route.id ?? null) }
}

export function useSeatRequests() {
  const [state, setState] = useState<SeatRequestsState>({ status: "loading" })
  const [deciding, setDeciding] = useState<string | null>(null)

  // Com cacheComponents a rota vive em <Activity>: o efeito roda de novo cada vez que a tela volta a aparecer.
  // setState só dentro do .then: regra react-hooks/set-state-in-effect
  // O cleanup volta a "loading" pra não mostrar, ao reaparecer, os pedidos da conta anterior.
  useEffect(() => {
    let active = true
    load().then((routes) => {
      if (active) setState((prev) => toState(prev, routes))
    })
    return () => {
      active = false
      setState({ status: "loading" })
    }
  }, [])

  // "Tentar de novo": em handler, setState direto é permitido
  function retry() {
    setState({ status: "loading" })
    load().then((routes) => setState((prev) => toState(prev, routes)))
  }

  function select(routeId: string) {
    setState((prev) => (prev.status === "ready" ? { ...prev, selectedRouteId: routeId } : prev))
  }

  async function decide(
    request: SeatRequest,
    run: (operatorId: string, enrollmentId: string) => Promise<Result<Enrollment>>,
    doneLabel: string,
  ) {
    setDeciding(request.id)
    try {
      const account = await getCurrentAccount()
      if (!account) throw new Error("no session")
      const result = await run(account.id, request.id)
      if (result.ok) {
        toast(`Pedido de ${request.studentName.trim().split(/\s+/)[0]} ${doneLabel}`)
        notifyPendingRequestsChanged()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Não deu pra salvar. Tenta de novo.")
    }
    const routes = await load()
    setState((prev) => toState(prev, routes))
    setDeciding(null)
  }

  return {
    state,
    deciding,
    retry,
    select,
    accept: (request: SeatRequest) => decide(request, acceptRequest, "aceito"),
    decline: (request: SeatRequest) => decide(request, declineRequest, "recusado"),
    dayLabel: (request: SeatRequest) => formatShortDay(request.requestedAt.slice(0, 10)),
  }
}
