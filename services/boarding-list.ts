import type { BoardingList, Passenger, TripDirection } from "@/types"
import { getNextOutboundDate } from "./clock"
import { listOperatorRoutes } from "./routes"
import { callPhase, getSeatBalance, occupiesLeg } from "./seat-balance"
import { read } from "./storage"

const byName = (a: Passenger, b: Passenger) => a.name.localeCompare(b.name, "pt-BR")

/** null when the route is missing or not the operator's. Date = getNextOutboundDate. */
export async function getBoardingList(
  operatorId: string, routeId: string, leg: TripDirection, now: string,
): Promise<BoardingList | null> {
  const route = (await listOperatorRoutes(operatorId)).find((r) => r.id === routeId)
  if (!route) return null

  const date = getNextOutboundDate(route.weekdays, route.outboundTime, now)
  const phase = callPhase(date, route.outboundTime, now)
  const balance = await getSeatBalance(routeId, date, now)
  const accounts = read("accounts")
  const nameOf = (studentId: string) => accounts.find((a) => a.id === studentId)?.name ?? ""
  const pointOf = (id: string) => route.boardingPoints.find((p) => p.id === id)
  const responses = read("outboundCallResponses").filter((r) => r.routeId === routeId && r.date === date)

  const fixed: Passenger[] = []
  const notGoing: Passenger[] = []
  const noResponse: Passenger[] = []
  for (const e of read("enrollments")) {
    const boardingPoint = pointOf(e.boardingPointId)
    // Only `confirmed` answers the call; accepted ones hold seats in the balance but are not listed.
    if (e.routeId !== routeId || e.status !== "confirmed" || !boardingPoint) continue
    const response = responses.find((r) => r.studentId === e.studentId)
    const passenger: Passenger = {
      studentId: e.studentId, name: nameOf(e.studentId), boardingPoint, kind: "fixed", noResponse: false,
    }
    if (response) (response[leg] ? fixed : notGoing).push(passenger)
    // No row: Sem resposta before −12 h (occupiesLeg), "Não vou" with the seal after it.
    else (occupiesLeg(undefined, leg, phase) ? noResponse : notGoing).push({ ...passenger, noResponse: true })
  }

  // The day pass covers both legs; one offer per route + date, the same one the balance uses.
  const single: Passenger[] = read("singleTripBookings")
    .filter((b) => b.status !== "cancelled" && b.offerId === balance.offer?.id && pointOf(b.boardingPointId))
    .map((b) => ({
      studentId: b.studentId, name: nameOf(b.studentId), boardingPoint: pointOf(b.boardingPointId)!,
      kind: "single", noResponse: false,
    }))

  const going = route.boardingPoints
    .map((boardingPoint) => ({
      boardingPoint,
      passengers: [
        ...fixed.filter((p) => p.boardingPoint.id === boardingPoint.id).sort(byName),
        ...single.filter((p) => p.boardingPoint.id === boardingPoint.id).sort(byName),
      ],
    }))
    .filter((g) => g.passengers.length > 0)

  return { route, date, leg, phase, balance, going, notGoing: notGoing.sort(byName), noResponse: noResponse.sort(byName) }
}
