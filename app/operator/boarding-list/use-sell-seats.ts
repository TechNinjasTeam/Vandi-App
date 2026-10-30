"use client"

// CAMADA 2 · HOOK do Drawer "Vender lugares sobrando" (Tela 9). Só guarda o estado e chama o service.
import { useState } from "react"
import { toast } from "sonner"

import { formatShortDay, getNow } from "@/services/clock"
import { formatMoney } from "@/services/dashboard"
import { businessDaysInMonth, singleTripPrice } from "@/services/pricing"
import { announceSeats } from "@/services/single-trips"
import type { Route, SeatBalance } from "@/types"

export function useSellSeats(operatorId: string, route: Route, balance: SeatBalance, onAnnounced: () => void) {
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const businessDays = businessDaysInMonth(balance.date.slice(0, 7))
  const price = formatMoney(singleTripPrice(route.monthlyPrice, businessDays))

  // Ao abrir, recomeça do que está à venda (ou 1) e limpa o erro da vez anterior.
  function onOpenChange(next: boolean) {
    if (next) {
      setQuantity(Math.min(Math.max(balance.onSale, 1), balance.sellable))
      setError(null)
    }
    setOpen(next)
  }

  async function announce() {
    setSubmitting(true)
    setError(null)
    try {
      const result = await announceSeats(operatorId, route.id, quantity, getNow())
      if (result.ok) {
        toast("Lugares anunciados.")
        setOpen(false)
        onAnnounced()
      } else {
        setError(result.error)
      }
    } catch {
      setError("Não deu pra salvar. Tenta de novo.")
    }
    setSubmitting(false)
  }

  return {
    open,
    onOpenChange,
    quantity,
    decrease: () => setQuantity((q) => Math.max(1, q - 1)),
    increase: () => setQuantity((q) => Math.min(balance.sellable, q + 1)),
    submitting,
    error,
    announce,
    price,
    monthlyPrice: formatMoney(route.monthlyPrice),
    businessDays,
    dayLabel: formatShortDay(balance.date),
  }
}
