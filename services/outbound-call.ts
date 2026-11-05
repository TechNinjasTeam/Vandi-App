import type {
  OutboundCall, OutboundCallAnswer, OutboundCallPhase, OutboundCallResponse, Result, Route, TripDirection,
} from "@/types"
import { getNextOutboundDate, hoursBefore, toInstant } from "./clock"
import { businessDaysInMonth, legCredit } from "./pricing"
import { uniqueId } from "./routes"
import { callDeadlines, callPhase, getSeatBalance, occupiesLeg } from "./seat-balance"
import { read, write } from "./storage"

const LEGS: TripDirection[] = ["outbound", "return"]
const hasOutboundTime = (route: Route) => !Number.isNaN(toInstant("2000-01-01", route.outboundTime))
const confirmedOf = (studentId: string) => read("enrollments").find((e) => e.studentId === studentId && e.status === "confirmed")

/** null without a confirmed enrollment or with an invalid outboundTime. Date = getNextOutboundDate. */
export async function getOutboundCall(studentId: string, now: string): Promise<OutboundCall | null> {
  const enrollment = confirmedOf(studentId)
  const route = read("routes").find((r) => r.id === enrollment?.routeId)
  if (!route || !hasOutboundTime(route)) return null
  const date = getNextOutboundDate(route.weekdays, route.outboundTime, now)
  const response = read("outboundCallResponses").find((r) => r.studentId === studentId && r.routeId === route.id && r.date === date)
  return {
    ...callDeadlines(date, route.outboundTime),
    routeId: route.id, date, phase: callPhase(date, route.outboundTime, now), response: response ?? null,
  }
}

type Target = { route: Route; date: string; phase: OutboundCallPhase; response: OutboundCallResponse | undefined }

/** Checks 1.4 in order: seat, outboundTime, call open. */
function resolveTarget(studentId: string, routeId: string, now: string): Result<Target> {
  const route = read("routes").find((r) => r.id === routeId)
  const enrolled = read("enrollments").some((e) => e.studentId === studentId && e.routeId === routeId && e.status === "confirmed")
  if (!route || !enrolled) return { ok: false, error: "Você não tem vaga fixa nesta van." }
  if (!hasOutboundTime(route)) return { ok: false, error: "Esta rota está sem horário de ida." }
  const date = getNextOutboundDate(route.weekdays, route.outboundTime, now)
  const phase = callPhase(date, route.outboundTime, now)
  if (phase === "not_open") return { ok: false, error: "A chamada ainda não abriu." }
  const response = read("outboundCallResponses").find((r) => r.studentId === studentId && r.routeId === routeId && r.date === date)
  return { ok: true, data: { route, date, phase, response } }
}

/** Upserts the row, then cancels the newest active booking of the balance's offer while a leg is below 0. Returns how many. */
async function saveAndFit(studentId: string, target: Target, outbound: boolean, ret: boolean, now: string): Promise<{ row: OutboundCallResponse; cancelled: number }> {
  const { route, date } = target
  const rows = read("outboundCallResponses")
  const row: OutboundCallResponse = {
    id: target.response?.id ?? uniqueId(`ocr-${studentId.replace(/^st-/, "")}-${date}`, new Set(rows.map((r) => r.id))),
    studentId, routeId: route.id, date, outbound, return: ret, answeredAt: now,
  }
  write("outboundCallResponses", target.response ? rows.map((r) => (r.id === row.id ? row : r)) : [...rows, row])

  let cancelled = 0
  for (;;) {
    const balance = await getSeatBalance(route.id, date, now)
    if (!balance.offer || (balance.outbound.leftover >= 0 && balance.return.leftover >= 0)) break
    const offerId = balance.offer.id
    const bookings = read("singleTripBookings")
    const newest = bookings
      .filter((b) => b.offerId === offerId && b.status !== "cancelled")
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0]
    if (!newest) break
    write("singleTripBookings", bookings.map((b) => (b.id === newest.id ? { ...b, status: "cancelled" as const } : b)))
    cancelled++
  }
  return { row, cancelled }
}

const ANSWERS: Record<OutboundCallAnswer, [boolean, boolean]> = {
  both: [true, true], outbound_only: [true, false], return_only: [false, true], none: [false, false],
}

/** Upserts the row of (student, route, next outbound date), answeredAt = now; then fits the bookings. */
export async function answerOutboundCall(
  studentId: string, routeId: string, answer: OutboundCallAnswer, now: string,
): Promise<Result<OutboundCallResponse>> {
  const target = resolveTarget(studentId, routeId, now)
  if (!target.ok) return target
  const [outbound, ret] = ANSWERS[answer]
  const { phase, response } = target.data
  const takes = (leg: TripDirection, wanted: boolean) => wanted && !occupiesLeg(response, leg, phase)
  if (phase === "after_reclaim" && (takes("outbound", outbound) || takes("return", ret))) {
    return { ok: false, error: "Agora só dá para liberar o lugar." }
  }
  const { row } = await saveAndFit(studentId, target.data, outbound, ret, now)
  return { ok: true, data: row }
}

/** Writes "both" until −6 h; cancels the most recent active booking while a leg's leftover < 0. */
export async function reclaimSeat(
  studentId: string, routeId: string, now: string,
): Promise<Result<{ cancelledBookings: number }>> {
  const target = resolveTarget(studentId, routeId, now)
  if (!target.ok) return target
  if (target.data.phase === "after_reclaim") return { ok: false, error: "Prazo para recorrer encerrado." }
  const { cancelled } = await saveAndFit(studentId, target.data, true, true, now)
  return { ok: true, data: { cancelledBookings: cancelled } }
}

/** Σ legCredit of the student's released legs matched to paid bookings (cents). */
export async function getCredit(studentId: string): Promise<number> {
  const routes = read("routes")
  const confirmed = new Set(read("enrollments").filter((e) => e.status === "confirmed").map((e) => `${e.routeId}|${e.studentId}`))
  let total = 0
  for (const mine of read("outboundCallResponses").filter((r) => r.studentId === studentId)) {
    const route = routes.find((r) => r.id === mine.routeId)
    if (!route || !hasOutboundTime(route)) continue
    const answerBy = hoursBefore(toInstant(mine.date, route.outboundTime), 12)
    // The same offer getSeatBalance uses: the first one of the route + date.
    const offer = read("singleTripOffers").find((o) => o.routeId === route.id && o.date === mine.date)
    const paid = read("singleTripBookings")
      .filter((b) => b.status === "paid" && b.offerId === offer?.id)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    const amount = legCredit(route.monthlyPrice, businessDaysInMonth(mine.date.slice(0, 7)))
    for (const leg of LEGS) {
      if (mine[leg]) continue
      // Released legs before −12 h by the order of the notice; the i-th paid booking matches the i-th release.
      const released = read("outboundCallResponses")
        .filter((r) => r.routeId === route.id && r.date === mine.date && !r[leg] && confirmed.has(`${r.routeId}|${r.studentId}`) && Date.parse(r.answeredAt) < answerBy)
        .sort((a, b) => Date.parse(a.answeredAt) - Date.parse(b.answeredAt))
      const index = released.findIndex((r) => r.id === mine.id)
      if (index >= 0 && index < paid.length) total += amount
    }
  }
  return total
}
