import type { MySingleTrip, Result, SingleTripBooking, SingleTripCard, SingleTripOffer } from "@/types"
import { addDays, getNextOutboundDate, toInstant } from "./clock"
import { businessDaysInMonth, singleTripPrice, vandiFee } from "./pricing"
import { uniqueId } from "./routes"
import { callDeadlines, getSeatBalance } from "./seat-balance"
import { read, write } from "./storage"
import { searchVans } from "./vans"

// The day pass ("Só um dia"): the operator announces leftover seats, a student without a fixed seat books and pays (Pix simulado).

/** Local "YYYY-MM-DDTHH:mm" read as an instant (ms). */
const instantOf = (localDateTime: string) => Date.parse(localDateTime)

/** Last moment to cancel: 20:00 of the eve (local). */
const cancelUntilOf = (date: string) => `${addDays(date, -1)}T20:00`

const slugOf = (id: string) => id.replace(/^(route|st)-/, "")

/** Sets offer.seats = sold + quantity for the next outbound (one offer per route + date). */
export async function announceSeats(
  operatorId: string, routeId: string, quantity: number, now: string,
): Promise<Result<SingleTripOffer>> {
  const route = read("routes").find((r) => r.id === routeId && r.operatorId === operatorId)
  if (!route) return { ok: false, error: "Rota não encontrada." }
  if (Number.isNaN(toInstant("2000-01-01", route.outboundTime))) return { ok: false, error: "Esta rota está sem horário de ida." }
  if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, error: "Escolha pelo menos 1 lugar." }

  const date = getNextOutboundDate(route.weekdays, route.outboundTime, now)
  const balance = await getSeatBalance(route.id, date, now)
  if (balance.sellable === 0) return { ok: false, error: "Não sobra lugar nos dois trechos." }
  if (quantity > balance.sellable) return { ok: false, error: `Só dá para vender até ${balance.sellable} lugares.` }

  const offers = read("singleTripOffers")
  const seats = balance.outbound.sold + quantity
  // getSeatBalance reads the first offer of the route + date: that is the one to adjust.
  const offer: SingleTripOffer = balance.offer
    ? { ...balance.offer, seats }
    : { id: uniqueId(`offer-${slugOf(route.id)}-${date}`, new Set(offers.map((o) => o.id))), routeId: route.id, date, seats, createdAt: now }
  write("singleTripOffers", balance.offer ? offers.map((o) => (o.id === offer.id ? offer : o)) : [...offers, offer])
  return { ok: true, data: offer }
}

/** Routes from searchVans(origin) whose next outbound has onSale > 0; storage order. */
export async function listSingleTrips(origin: string, now: string): Promise<SingleTripCard[]> {
  const cards: SingleTripCard[] = []
  for (const van of await searchVans(origin)) {
    if (Number.isNaN(toInstant("2000-01-01", van.outboundTime))) continue
    const date = getNextOutboundDate(van.weekdays, van.outboundTime, now)
    const { offer, onSale } = await getSeatBalance(van.id, date, now)
    if (!offer || onSale < 1) continue
    cards.push({
      van, offerId: offer.id, date,
      price: singleTripPrice(van.monthlyPrice, businessDaysInMonth(date.slice(0, 7))),
      available: onSale,
      reclaimUntil: callDeadlines(date, van.outboundTime).reclaimUntil,
    })
  }
  return cards
}

/** Writes a "pending" booking: price/vandiFee from pricing.ts on the offer date's month, operatorShare = price − vandiFee, creditUsed 0, createdAt = now. */
export async function bookSingleTrip(
  studentId: string, offerId: string, boardingPointId: string, now: string,
): Promise<Result<SingleTripBooking>> {
  if (read("accounts").find((a) => a.id === studentId)?.role !== "student") {
    return { ok: false, error: "Só aluno pode reservar a diária." }
  }
  const offers = read("singleTripOffers")
  const offer = offers.find((o) => o.id === offerId)
  const route = read("routes").find((r) => r.id === offer?.routeId)
  if (!offer || !route || !(toInstant(offer.date, route.outboundTime) > Date.parse(now))) {
    return { ok: false, error: "Essa diária não está mais à venda." }
  }
  if (read("enrollments").some((e) => e.studentId === studentId && e.routeId === route.id && e.status === "confirmed")) {
    return { ok: false, error: "Você já tem vaga fixa nesta van." }
  }
  if (!read("boardingPoints").some((p) => p.id === boardingPointId && p.routeId === route.id)) {
    return { ok: false, error: "Escolha um ponto desta van." }
  }
  const bookings = read("singleTripBookings")
  const dateOf = (id: string) => offers.find((o) => o.id === id)?.date
  if (bookings.some((b) => b.studentId === studentId && b.status !== "cancelled" && dateOf(b.offerId) === offer.date)) {
    return { ok: false, error: "Você já tem uma diária neste dia." }
  }
  const balance = await getSeatBalance(route.id, offer.date, now)
  if (balance.offer?.id !== offer.id || balance.onSale < 1) return { ok: false, error: "Acabaram os lugares desta diária." }

  const days = businessDaysInMonth(offer.date.slice(0, 7))
  const price = singleTripPrice(route.monthlyPrice, days)
  const fee = vandiFee(price, route.monthlyPrice, days)
  const booking: SingleTripBooking = {
    id: uniqueId(`booking-${slugOf(studentId)}-${offer.date}`, new Set(bookings.map((b) => b.id))),
    offerId, studentId, boardingPointId, price, vandiFee: fee, operatorShare: price - fee, creditUsed: 0,
    status: "pending", createdAt: now,
  }
  write("singleTripBookings", [...bookings, booking])
  return { ok: true, data: booking }
}

/** Changes the status of the student's booking; `refuse` returns the error for a status that cannot change. */
function changeBooking(
  studentId: string, bookingId: string, to: "paid" | "cancelled", refuse: (b: SingleTripBooking) => string | null,
): Result<SingleTripBooking> {
  const bookings = read("singleTripBookings")
  const booking = bookings.find((b) => b.id === bookingId && b.studentId === studentId)
  if (!booking) return { ok: false, error: "Reserva não encontrada." }
  const error = refuse(booking)
  if (error) return { ok: false, error }
  const changed = { ...booking, status: to }
  write("singleTripBookings", bookings.map((b) => (b.id === bookingId ? changed : b)))
  return { ok: true, data: changed }
}

/** pending → paid (Pix simulado). */
export async function payBooking(studentId: string, bookingId: string): Promise<Result<SingleTripBooking>> {
  return changeBooking(studentId, bookingId, "paid", (b) =>
    b.status === "cancelled" ? "Essa reserva foi cancelada." : b.status === "paid" ? "Essa reserva já está paga." : null,
  )
}

/** pending | paid → cancelled, until 20:00 of the eve. */
export async function cancelBooking(
  studentId: string, bookingId: string, now: string,
): Promise<Result<SingleTripBooking>> {
  const offers = read("singleTripOffers")
  return changeBooking(studentId, bookingId, "cancelled", (b) => {
    if (b.status === "cancelled") return "Essa reserva já foi cancelada."
    const date = offers.find((o) => o.id === b.offerId)?.date
    return date && Date.parse(now) >= instantOf(cancelUntilOf(date))
      ? "Depois das 20h da véspera não dá mais para cancelar."
      : null
  })
}

/** The student's bookings whose departure is after now, any status, newest createdAt first. */
export async function getMySingleTrips(studentId: string, now: string): Promise<MySingleTrip[]> {
  const offers = read("singleTripOffers")
  const nowMs = Date.parse(now)
  const trips: MySingleTrip[] = []
  for (const booking of read("singleTripBookings").filter((b) => b.studentId === studentId)) {
    const offer = offers.find((o) => o.id === booking.offerId)
    const route = read("routes").find((r) => r.id === offer?.routeId)
    const boardingPoint = read("boardingPoints").find((p) => p.id === booking.boardingPointId)
    if (!offer || !route || !boardingPoint || !(toInstant(offer.date, route.outboundTime) > nowMs)) continue
    const operator = read("accounts").find((a) => a.id === route.operatorId)
    const cancelUntil = cancelUntilOf(offer.date)
    const { reclaimUntil } = callDeadlines(offer.date, route.outboundTime)
    const active = booking.status !== "cancelled"
    trips.push({
      booking, route, boardingPoint, date: offer.date, cancelUntil, reclaimUntil,
      operatorName: operator?.name ?? "", operatorPhone: operator?.phone ?? "",
      canCancel: active && nowMs < instantOf(cancelUntil),
      atRisk: active && nowMs < instantOf(reclaimUntil),
    })
  }
  return trips.sort((a, b) => Date.parse(b.booking.createdAt) - Date.parse(a.booking.createdAt))
}
