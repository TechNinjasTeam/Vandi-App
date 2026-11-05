"use client"

// CAMADA 2 · HOOK da aba "Só um dia" da Tela 6. Só guarda o estado e chama os services.
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { formatShortDay, getNow } from "@/services/clock"
import { formatMoney } from "@/services/dashboard"
import { getCurrentAccount } from "@/services/session"
import { bookSingleTrip, listSingleTrips } from "@/services/single-trips"
import type { SingleTripCard } from "@/types"

export type SingleTripItem = {
  card: SingleTripCard
  operatorFirstName: string
  priceLabel: string
  dayLabel: string
  reclaimTime: string // "11:50"
}

type SingleTripsState = { status: "loading" } | { status: "error" } | { status: "ready"; items: SingleTripItem[] }

const toItems = (cards: SingleTripCard[]): SingleTripItem[] =>
  cards.map((card) => ({
    card,
    operatorFirstName: card.van.operatorName.trim().split(/\s+/)[0],
    priceLabel: formatMoney(card.price),
    dayLabel: formatShortDay(card.date),
    reclaimTime: card.reclaimUntil.slice(11, 16),
  }))

function load(query: string): Promise<SingleTripsState> {
  return listSingleTrips(query, getNow())
    .then((cards): SingleTripsState => ({ status: "ready", items: toItems(cards) }))
    .catch((): SingleTripsState => ({ status: "error" }))
}

export function useSingleTrips() {
  const router = useRouter()
  const [state, setState] = useState<SingleTripsState>({ status: "loading" })
  const [query, setQuery] = useState("")
  // Espelho de `query` para o efeito e o "Tentar de novo" relerem a cidade digitada.
  const queryRef = useRef("")
  const [selected, setSelected] = useState<SingleTripItem | null>(null)
  const [pointId, setPointId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Trava síncrona: dois toques seguidos em "Reservar" gravam uma reserva só (state só muda no próximo render).
  const busy = useRef(false)

  // setState só dentro do .then (react-hooks/set-state-in-effect). O cleanup volta a "loading" pra não
  // mostrar a oferta da conta anterior e zera o que a visita deixou; `active` descarta carga atrasada.
  useEffect(() => {
    let active = true
    load(queryRef.current).then((next) => {
      if (active) setState(next)
    })
    return () => {
      active = false
      setState({ status: "loading" })
      setSelected(null)
      setPointId(null)
      setSubmitError(null)
    }
  }, [])

  function search(value: string) {
    queryRef.current = value
    setQuery(value)
    listSingleTrips(value, getNow()).then(
      (cards) => setState((prev) => (prev.status === "ready" ? { ...prev, items: toItems(cards) } : prev)),
      () => setState({ status: "error" }),
    )
  }

  function retry() {
    setState({ status: "loading" })
    load(queryRef.current).then(setState)
  }

  function select(item: SingleTripItem) {
    setPointId(null)
    setSubmitError(null)
    setSelected(item)
  }

  function close() {
    setSelected(null)
  }

  async function book() {
    if (!selected || !pointId || busy.current) return
    busy.current = true
    setSubmitting(true)
    setSubmitError(null)
    try {
      const account = await getCurrentAccount()
      if (!account) throw new Error("no session")
      const result = await bookSingleTrip(account.id, selected.card.offerId, pointId, getNow())
      if (result.ok) {
        setSelected(null)
        toast.success("Diária reservada. Pague com Pix na Minha rota.")
        router.push("/student/my-route")
      } else setSubmitError(result.error)
    } catch {
      setSubmitError("Não deu pra salvar. Tenta de novo.")
    } finally {
      busy.current = false
      setSubmitting(false)
    }
  }

  return { state, query, search, retry, selected, select, close, pointId, setPointId, submitting, submitError, book }
}
