"use client"

// CAMADA 2 · HOOK da Tela 8 (Minha rota do aluno). Só guarda o estado e chama os services.
import { useEffect, useState } from "react"

import { confirmSeat, getMyRoute, withdrawRequest } from "@/services/enrollments"
import { getCurrentAccount } from "@/services/session"
import type { MyEnrollment, MyRoute } from "@/types"

type MyRouteState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty"; firstName: string }
  | { status: "ready"; accountId: string; firstName: string; myRoute: MyRoute }

type Drawer = { action: "confirm" | "withdraw"; enrollment: MyEnrollment }

function load(): Promise<MyRouteState> {
  return getCurrentAccount()
    .then(async (account): Promise<MyRouteState> => {
      if (!account) throw new Error("no session")
      const firstName = account.name.trim().split(/\s+/)[0]
      const myRoute = await getMyRoute(account.id)
      if (!myRoute) return { status: "empty", firstName }
      return { status: "ready", accountId: account.id, firstName, myRoute }
    })
    .catch((): MyRouteState => ({ status: "error" }))
}

export function useMyRoute() {
  const [state, setState] = useState<MyRouteState>({ status: "loading" })
  const [drawer, setDrawer] = useState<Drawer | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)

  // Com cacheComponents a rota vive em <Activity>: este efeito roda de novo cada vez que a tela volta a aparecer.
  // setState só dentro do .then: regra react-hooks/set-state-in-effect
  // O cleanup volta a "loading" pra não mostrar dados da conta anterior; `active` descarta carga atrasada.
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

  function open(action: Drawer["action"], enrollment: MyEnrollment) {
    setDrawerError(null)
    setDrawer({ action, enrollment })
  }

  function close() {
    setDrawer(null)
  }

  async function submit() {
    if (!drawer || state.status !== "ready") return
    setSubmitting(true)
    const write = drawer.action === "confirm" ? confirmSeat : withdrawRequest
    const result = await write(state.accountId, drawer.enrollment.id)
    setSubmitting(false)
    if (!result.ok) {
      setDrawerError(result.error)
      return
    }
    setDrawer(null)
    load().then(setState)
  }

  return { state, retry, drawer, open, close, submitting, drawerError, submit }
}
