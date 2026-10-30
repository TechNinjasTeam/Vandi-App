"use client"

// CAMADA 2 · HOOK da diária na Tela 8. Só guarda o estado e chama os services.
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { formatShortDay, getNow } from "@/services/clock"
import { formatMoney } from "@/services/dashboard"
import { cancelBooking, getMySingleTrips, payBooking } from "@/services/single-trips"
import type { MySingleTrip } from "@/types"

// A tela recebe a diária com dia e preço já formatados.
export type SingleTripView = MySingleTrip & { dayLabel: string; priceLabel: string; cancelDayLabel: string }
type State = { status: "loading" } | { status: "error" } | { status: "ready"; trips: SingleTripView[] }
type Drawer = { action: "pay" | "cancel"; trip: SingleTripView }

function load(studentId: string): Promise<State> {
  return getMySingleTrips(studentId, getNow())
    .then(
      (trips): State => ({
        status: "ready",
        trips: trips.map((trip) => ({
          ...trip,
          dayLabel: formatShortDay(trip.date),
          priceLabel: formatMoney(trip.booking.price),
          cancelDayLabel: formatShortDay(trip.cancelUntil.slice(0, 10)),
        })),
      }),
    )
    .catch((): State => ({ status: "error" }))
}

export function useMySingleTrips(studentId: string) {
  const [state, setState] = useState<State>({ status: "loading" })
  const [drawer, setDrawer] = useState<Drawer | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)

  // setState só dentro do .then: regra react-hooks/set-state-in-effect.
  // O cleanup volta a "loading" pra não mostrar a diária da conta anterior (troca de conta no mesmo celular).
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

  function retry() {
    setState({ status: "loading" })
    load(studentId).then(setState)
  }

  function open(action: Drawer["action"], trip: SingleTripView) {
    setDrawerError(null)
    setDrawer({ action, trip })
  }

  function close() {
    setDrawer(null)
  }

  async function submit() {
    if (!drawer || submitting) return
    const { action, trip } = drawer
    setSubmitting(true)
    const result =
      action === "pay"
        ? await payBooking(studentId, trip.booking.id)
        : await cancelBooking(studentId, trip.booking.id, getNow())
    setSubmitting(false)
    if (!result.ok) {
      setDrawerError(result.error)
      return
    }
    setDrawer(null)
    if (action === "pay") toast.success("Pagamento aprovado. Sua diária está garantida.")
    else if (trip.booking.status === "paid") toast.success(`Diária cancelada. Você recebe ${trip.priceLabel} de volta.`)
    else toast.success("Diária cancelada.")
    load(studentId).then(setState)
  }

  return { state, retry, drawer, open, close, submitting, drawerError, submit }
}
