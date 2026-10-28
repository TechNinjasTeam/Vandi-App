import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Dashboard, Route } from "@/types"
import { clearAll, read, seed, write } from "./storage"
import { buildDashboard } from "./metrics"
import { formatMoney, formatPercent, formatShortDate, formatWeekCaption, getDashboard } from "./dashboard"

vi.mock("./metrics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./metrics")>()),
  buildDashboard: vi.fn(() => ({ status: "empty", week: { start: "s", end: "e" } })),
}))

function makeFake(overrides: Record<string, unknown> = {}) {
  const map = new Map<string, string>()
  return {
    map,
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
    ...overrides,
  }
}

const TODAY = "2026-10-27"

beforeEach(() => {
  vi.stubGlobal("localStorage", makeFake())
  clearAll()
  seed(TODAY)
  vi.mocked(buildDashboard).mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("getDashboard", () => {
  it("passes only the operator's routes and the stored lists to buildDashboard, and returns its result", async () => {
    const result = await getDashboard("op-carlos", "all", TODAY)

    expect(buildDashboard).toHaveBeenCalledTimes(1)
    expect(buildDashboard).toHaveBeenCalledWith(
      {
        routes: read("routes").filter((r) => r.operatorId === "op-carlos"),
        enrollments: read("enrollments"),
        trips: read("trips"),
        absences: read("absences"),
        singleTripOffers: read("singleTripOffers"),
        singleTripBookings: read("singleTripBookings"),
      },
      "all",
      TODAY,
    )
    expect(result).toEqual({ status: "empty", week: { start: "s", end: "e" } })
  })

  it("passes the filter and today through as given", async () => {
    await getDashboard("op-carlos", "route-carlos", "2026-11-01")

    const [, filter, today] = vi.mocked(buildDashboard).mock.calls[0]
    expect(filter).toBe("route-carlos")
    expect(today).toBe("2026-11-01")
  })

  it("an operator without routes reaches buildDashboard with no routes (empty case)", async () => {
    const result: Dashboard = await getDashboard("op-without-routes", "all", TODAY)

    expect(vi.mocked(buildDashboard).mock.calls[0][0].routes).toEqual([])
    expect(result.status).toBe("empty")
  })

  it("a route of another operator never reaches the metrics, even as the filter", async () => {
    await getDashboard("op-carlos", "route-ana", TODAY)

    const [input, filter] = vi.mocked(buildDashboard).mock.calls[0]
    expect(input.routes.map((r) => r.id)).toEqual(["route-carlos"])
    expect(filter).toBe("route-ana") // buildDashboard falls back to "all" (plan)
  })

  it("a route created for the operator shows up in the routes, with its origin", async () => {
    const created: Route = {
      ...read("routes")[0],
      id: "route-new",
      operatorId: "op-carlos",
      origin: "Salto",
    }
    write("routes", [...read("routes"), created])

    await getDashboard("op-carlos", "all", TODAY)

    const routes = vi.mocked(buildDashboard).mock.calls[0][0].routes
    expect(routes.map((r) => r.id)).toEqual(["route-carlos", "route-new"])
    expect(routes[1].origin).toBe("Salto")
  })
})

describe("formatMoney", () => {
  it.each([
    [12100, "R$ 121"],
    [150, "R$ 1,50"],
    [0, "R$ 0"],
    [4500, "R$ 45"],
    [123456, "R$ 1.234,56"],
    [100000, "R$ 1.000"],
  ])("%i cents → %s", (cents, expected) => {
    expect(formatMoney(cents)).toBe(expected)
  })
})

describe("formatPercent", () => {
  it.each([
    [7 / 11, "64%"],
    [0, "0%"],
    [1, "100%"],
    [null, "—"],
  ])("%s → %s", (rate, expected) => {
    expect(formatPercent(rate)).toBe(expected)
  })
})

describe("formatShortDate", () => {
  it.each([
    ["2026-10-05", "5/10"],
    ["2026-08-31", "31/8"],
    ["2026-10-19", "19/10"],
  ])("%s → %s", (date, expected) => {
    expect(formatShortDate(date)).toBe(expected)
  })
})

describe("formatWeekCaption", () => {
  it.each([
    ["2026-10-26", "2026-10-27", "Semana de 26 a 27/10"],
    ["2026-10-19", "2026-10-24", "Semana de 19 a 24/10"],
    ["2026-09-28", "2026-10-03", "Semana de 28/9 a 3/10"], // across months
    ["2026-10-26", "2026-10-26", "Semana de 26/10"], // Monday: start = end
  ])("%s to %s → %s", (start, end, expected) => {
    expect(formatWeekCaption(start, end)).toBe(expected)
  })
})
