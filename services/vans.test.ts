import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearAll, read, seed, write } from "./storage"
import { getVan, searchVans } from "./vans"

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
  seed("2026-10-30")
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ids = (vans: { id: string }[]) => vans.map((v) => v.id)

describe("searchVans", () => {
  it("a blank city lists every route in storage order, with operator, points and free seats", async () => {
    const vans = await searchVans("")
    expect(ids(vans)).toEqual(["route-carlos", "route-ana", "route-marcia"])
    const [carlos, ana, marcia] = vans
    expect(carlos).toMatchObject({ operatorName: "Carlos Almeida", operatorPhone: "(11) 90000-0040", freeSeats: 3, full: false })
    expect(ids(carlos.boardingPoints)).toEqual(["bp-carlos-matriz", "bp-carlos-rodoviaria"])
    expect(ana.freeSeats).toBe(6) // Laura's accepted seat counts
    expect(marcia).toMatchObject({ freeSeats: 0, full: true })
  })

  it("a spaces-only city also lists every route", async () => {
    expect(ids(await searchVans("   "))).toEqual(["route-carlos", "route-ana", "route-marcia"])
  })

  it.each(["itu", "  ITU ", "Itú"])("%j matches the start of the origin, ignoring accent, case and outer spaces", async (city) => {
    expect(ids(await searchVans(city))).toEqual(["route-carlos", "route-marcia"])
  })

  it("matches only the start of the origin, not the middle", async () => {
    expect(ids(await searchVans("sal"))).toEqual(["route-ana"])
    expect(await searchVans("tu")).toEqual([])
  })

  it("a city with no route gives an empty list", async () => {
    expect(await searchVans("Sorocaba")).toEqual([])
  })

  it("free seats never go below zero", async () => {
    write("routes", read("routes").map((r) => (r.id === "route-carlos" ? { ...r, seats: 10 } : r)))
    const [carlos] = await searchVans("itu")
    expect(carlos).toMatchObject({ id: "route-carlos", freeSeats: 0, full: true })
  })
})

describe("getVan", () => {
  it("a student with nothing has neither a confirmed seat nor a request", async () => {
    expect(await getVan("route-carlos", "st-rafael-moura")).toMatchObject({
      id: "route-carlos", operatorName: "Carlos Almeida", freeSeats: 3, hasConfirmedSeat: false, hasActiveRequest: false,
    })
  })

  it("knows the student's confirmed seat on any route", async () => {
    expect(await getVan("route-ana", "st-mateus-lima")).toMatchObject({ hasConfirmedSeat: true, hasActiveRequest: false })
  })

  it("knows a requested or accepted enrollment on this route", async () => {
    expect((await getVan("route-carlos", "st-beatriz-campos"))?.hasActiveRequest).toBe(true) // requested
    expect((await getVan("route-ana", "st-laura-bastos"))?.hasActiveRequest).toBe(true) // accepted
  })

  it("a request on another route does not count as a request here", async () => {
    expect((await getVan("route-ana", "st-beatriz-campos"))?.hasActiveRequest).toBe(false)
  })

  it("a cancelled enrollment is no longer an active request", async () => {
    write("enrollments", read("enrollments").map((e) => (e.id === "enr-beatriz-campos" ? { ...e, status: "cancelled" as const } : e)))
    expect((await getVan("route-carlos", "st-beatriz-campos"))?.hasActiveRequest).toBe(false)
  })

  it("returns null when the route does not exist", async () => {
    expect(await getVan("route-x", "st-rafael-moura")).toBeNull()
  })
})
