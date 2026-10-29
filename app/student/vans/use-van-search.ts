"use client"

// CAMADA 2 · HOOK da Tela 6 (Buscar vans). Só guarda o estado e chama os services.
import { useEffect, useRef, useState } from "react"

import { formatMonthlyPrice, formatWeekdays } from "@/services/routes"
import { getCurrentAccount } from "@/services/session"
import { searchVans } from "@/services/vans"
import type { VanListing } from "@/types"

export type VanItem = { van: VanListing; operatorFirstName: string; daysLabel: string; priceLabel: string }

type VanSearchState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; firstName: string; vans: VanItem[] }

const firstNameOf = (name: string) => name.trim().split(/\s+/)[0]

const toItems = (vans: VanListing[]): VanItem[] =>
  vans.map((van) => ({
    van,
    operatorFirstName: firstNameOf(van.operatorName),
    daysLabel: formatWeekdays(van.weekdays),
    priceLabel: formatMonthlyPrice(van.monthlyPrice),
  }))

function load(query: string): Promise<VanSearchState> {
  return getCurrentAccount()
    .then(async (account): Promise<VanSearchState> => {
      if (!account) throw new Error("no session")
      return { status: "ready", firstName: firstNameOf(account.name), vans: toItems(await searchVans(query)) }
    })
    .catch((): VanSearchState => ({ status: "error" }))
}

export function useVanSearch() {
  const [state, setState] = useState<VanSearchState>({ status: "loading" })
  const [query, setQuery] = useState("")
  // Espelho de `query` para o efeito e o "Tentar de novo" relerem a cidade digitada ao voltar da Tela 7.
  const queryRef = useRef("")

  // Com cacheComponents a rota vive em <Activity>: o efeito roda de novo cada vez que a tela volta a aparecer,
  // já com a cidade digitada. setState só dentro do .then (react-hooks/set-state-in-effect).
  // O cleanup volta a "loading" pra não mostrar dados da conta anterior; `active` descarta carga atrasada.
  useEffect(() => {
    let active = true
    load(queryRef.current).then((next) => {
      if (active) setState(next)
    })
    return () => {
      active = false
      setState({ status: "loading" })
    }
  }, [])

  function search(value: string) {
    queryRef.current = value
    setQuery(value)
    searchVans(value).then(
      (vans) => setState((prev) => (prev.status === "ready" ? { ...prev, vans: toItems(vans) } : prev)),
      () => setState({ status: "error" }),
    )
  }

  function retry() {
    setState({ status: "loading" })
    load(queryRef.current).then(setState)
  }

  return { state, query, search, retry }
}
