import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getBoardingList } from "./boarding-list"
import { addDays, toInstant } from "./clock"
import { computeWeek } from "./metrics"
import { clearAll, read, seed } from "./storage"

function makeFake() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size
    },
  }
}

beforeEach(() => {
  vi.stubGlobal("localStorage", makeFake())
  clearAll()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// Never a hand-written offset: the runner may be in any timezone.
const at = (date: string, time: string) => new Date(toInstant(date, time)).toISOString()

// Days when Ana (Mon/Wed/Fri) or Márcia (Mon/Wed/Fri) runs today. Neither has a hand-written live offer:
// whatever the history dated today holds must not turn into their live offer.
const CASES = [
  { today: "2026-10-30", operatorId: "op-ana", routeId: "route-ana" }, // Friday
  { today: "2026-10-30", operatorId: "op-marcia", routeId: "route-marcia" },
  { today: "2026-10-28", operatorId: "op-marcia", routeId: "route-marcia" }, // Wednesday
]

describe("history of today on a day the van runs", () => {
  it.each(CASES)("$routeId on $today: the boarding list has no day pass nobody announced", async ({ today, operatorId, routeId }) => {
    seed(today)
    const list = await getBoardingList(operatorId, routeId, "outbound", at(today, "01:00"))
    expect(list?.date).toBe(today)
    // At 01:00 the call is still open: fixed passengers without an answer sit in `noResponse`, not in `going`.
    const passengers = [...list!.going.flatMap((g) => g.passengers), ...list!.noResponse, ...list!.notGoing]
    expect(passengers.filter((p) => p.kind === "fixed").length).toBeGreaterThan(0) // the fixed passengers are still there
    expect(passengers.filter((p) => p.kind === "single")).toEqual([])
  })

  it.each(CASES)("$routeId on $today: the dashboard counts no booking dated today", ({ today, routeId }) => {
    seed(today)
    const input = {
      routes: read("routes"), enrollments: read("enrollments"), trips: read("trips"), absences: read("absences"),
      singleTripOffers: read("singleTripOffers"), singleTripBookings: read("singleTripBookings"),
    }
    const weekStart = "2026-10-26"
    const withToday = computeWeek(input, routeId, weekStart, today)
    const untilYesterday = computeWeek(input, routeId, weekStart, addDays(today, -1))
    expect(withToday.tripCount).toBe(untilYesterday.tripCount + 1) // today's trip is counted
    expect(withToday.sold).toBe(untilYesterday.sold)
    expect(withToday.earnings).toBe(untilYesterday.earnings)
  })
})
