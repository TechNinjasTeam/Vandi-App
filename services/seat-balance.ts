import type { CallDeadlines, LegBalance, OutboundCallPhase, OutboundCallResponse, SeatBalance, TripDirection } from "@/types"
import { hoursBefore, toInstant, toLocalDateTime } from "./clock"
import { read } from "./storage"

// Shared rules of the outbound call (DEC-066, DEC-071): who holds a seat on each leg and how many are left.

export function callDeadlines(date: string, outboundTime: string): CallDeadlines {
  const departure = toInstant(date, outboundTime)
  return {
    departure: toLocalDateTime(departure),
    opensAt: toLocalDateTime(hoursBefore(departure, 24)),
    answerBy: toLocalDateTime(hoursBefore(departure, 12)),
    reclaimUntil: toLocalDateTime(hoursBefore(departure, 6)),
  }
}

/** "not_open" < −24 h ≤ "open" < −12 h ≤ "after_deadline" < −6 h ≤ "after_reclaim". Invalid outboundTime → "not_open". */
export function callPhase(date: string, outboundTime: string, now: string): OutboundCallPhase {
  const departure = toInstant(date, outboundTime)
  const instant = Date.parse(now)
  if (Number.isNaN(departure) || instant < hoursBefore(departure, 24)) return "not_open"
  if (instant < hoursBefore(departure, 12)) return "open"
  if (instant < hoursBefore(departure, 6)) return "after_deadline"
  return "after_reclaim"
}

/** response ? response[leg] : phase is "not_open" or "open" (Sem resposta keeps the seat until −12 h). */
export function occupiesLeg(response: OutboundCallResponse | undefined, leg: TripDirection, phase: OutboundCallPhase): boolean {
  return response ? response[leg] : phase === "not_open" || phase === "open"
}

/**
 * going = confirmed enrollments taking the leg + accepted ones (both legs, never released: only `confirmed`
 * answers the call; DEC-058); sold = pending + paid bookings of the route's offer on `date`.
 */
export async function getSeatBalance(routeId: string, date: string, now: string): Promise<SeatBalance> {
  const route = read("routes").find((r) => r.id === routeId)
  const seats = route?.seats ?? 0
  const phase = route ? callPhase(date, route.outboundTime, now) : "not_open"
  const enrollments = read("enrollments").filter((e) => e.routeId === routeId)
  const accepted = enrollments.filter((e) => e.status === "accepted").length
  const confirmed = enrollments.filter((e) => e.status === "confirmed")
  const responses = read("outboundCallResponses").filter((r) => r.routeId === routeId && r.date === date)
  // One offer per route + date. The demo history can add a second one dated today; the hand-written one comes first.
  const offer = read("singleTripOffers").find((o) => o.routeId === routeId && o.date === date) ?? null
  const sold = read("singleTripBookings").filter((b) => b.status !== "cancelled" && b.offerId === offer?.id).length

  const leg = (direction: TripDirection): LegBalance => {
    const going =
      accepted +
      confirmed.filter((e) => occupiesLeg(responses.find((r) => r.studentId === e.studentId), direction, phase)).length
    return { going, sold, leftover: seats - going - sold }
  }
  const outbound = leg("outbound")
  const sellable = Math.max(0, Math.min(outbound.leftover, leg("return").leftover))
  return {
    routeId, date, seats, outbound, return: leg("return"), sellable, offer,
    onSale: offer ? Math.max(0, Math.min(offer.seats - sold, sellable)) : 0,
  }
}
