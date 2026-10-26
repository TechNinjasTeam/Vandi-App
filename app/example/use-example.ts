"use client"

// CAMADA 2 · HOOK. Só guarda o estado da tela (carregando, erro, vazio, sucesso) e chama o service.
// Não tem regra de negócio, não conhece localStorage nem mocks. Nasce ao lado da tela;
// sobe para `hooks/` quando uma segunda tela usar.
import { useEffect, useState } from "react"

import { listExampleRoutes, type ExampleSimulation } from "@/services/example"
import type { Route } from "@/types"

type ExampleState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "success"; routes: Route[] }

// `?state=` existe só na tela-exemplo, para forçar vazio/erro. Telas novas não copiam isto.
// Lê `window` dentro do carregamento (nunca no render) para o servidor e o 1º desenho do cliente saírem iguais.
function load(): Promise<ExampleState> {
  const param = new URLSearchParams(window.location.search).get("state")
  const simulate = param === "empty" || param === "error" ? (param as ExampleSimulation) : undefined
  return listExampleRoutes(simulate).then(
    (routes): ExampleState => (routes.length === 0 ? { status: "empty" } : { status: "success", routes }),
    (): ExampleState => ({ status: "error" }),
  )
}

export function useExample() {
  // Começa em "loading": é o que a tela mostra no 1º desenho.
  const [state, setState] = useState<ExampleState>({ status: "loading" })

  // Regra do lint (react-hooks/set-state-in-effect): setState só dentro do .then, nunca direto no efeito.
  useEffect(() => {
    load().then(setState)
  }, [])

  // "Tentar de novo": volta ao Skeleton e carrega outra vez. Em handler, setState direto é permitido.
  function retry() {
    setState({ status: "loading" })
    load().then(setState)
  }

  return { state, retry }
}
