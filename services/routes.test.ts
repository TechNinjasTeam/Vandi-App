import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearAll, read, seed, write } from "./storage"
import { listOperatorRoutes, occupiedSeats } from "./routes"

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

beforeEach(() => {
  vi.stubGlobal("localStorage", makeFake())
  clearAll()
  seed("2026-10-30")
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("occupiedSeats", () => {
  it.each([
    ["route-carlos", 12], // its "requested" enrollment is not counted
    ["route-ana", 8],
    ["route-marcia", 15],
    ["route-x", 0],
  ])("%s has %i occupied seats", async (routeId, expected) => {
    expect(await occupiedSeats(routeId)).toBe(expected)
  })

  it("a declined enrollment does not take a seat", async () => {
    write("enrollments", [
      ...read("enrollments"),
      {
        id: "enr-t",
        routeId: "route-ana",
        studentId: "st-t",
        boardingPointId: "bp-ana-igreja",
        status: "declined",
        requestedAt: "2026-10-30T10:00:00-03:00",
      },
    ])
    expect(await occupiedSeats("route-ana")).toBe(8)
  })
})

describe("listOperatorRoutes", () => {
  it("lists only the operator's routes, with seats and sorted points", async () => {
    const list = await listOperatorRoutes("op-carlos")
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: "route-carlos", seats: 15, occupiedSeats: 12 })
    expect(list[0].boardingPoints.map((p) => p.id)).toEqual(["bp-carlos-matriz", "bp-carlos-rodoviaria"])
    expect(list.every((r) => r.operatorId === "op-carlos")).toBe(true)
  })

  it("sorts the points by order, whatever the storage order", async () => {
    write("boardingPoints", [...read("boardingPoints")].reverse())
    const list = await listOperatorRoutes("op-carlos")
    expect(list[0].boardingPoints.map((p) => p.id)).toEqual(["bp-carlos-matriz", "bp-carlos-rodoviaria"])
  })

  it("an operator without routes gets an empty list", async () => {
    expect(await listOperatorRoutes("op-julia-avila")).toEqual([])
  })
})
