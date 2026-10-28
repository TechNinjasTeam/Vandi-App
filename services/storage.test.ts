import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import accounts from "@/mocks/accounts.json"
import handAbsences from "@/mocks/absences.json"
import handBookings from "@/mocks/single-trip-bookings.json"
import handOffers from "@/mocks/single-trip-offers.json"
import routes from "@/mocks/routes.json"
import type { Route, Weekday } from "@/types"
import { WEEKDAYS, getNextTripDate } from "./clock"
import { clearAll, read, readSession, seed, write, writeSession, type Subject } from "./storage"

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

const TOKEN = /^(today([+-]\d+)?|next-trip|week-\d+-(mon|tue|wed|thu|fri|sat))(T\d{2}:\d{2})?$/
const subjects: Subject[] = [
  "accounts", "routes", "boardingPoints", "enrollments", "trips", "absences", "returnCalls",
  "returnCallResponses", "singleTripOffers", "singleTripBookings", "monthlyFees", "pushSubscriptions",
]
const changedRoutes: Route[] = [{ ...(routes[0] as Route), seats: 3 }]

let fake: ReturnType<typeof makeFake>

beforeEach(() => {
  fake = makeFake()
  vi.stubGlobal("localStorage", fake)
  clearAll()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("seed", () => {
  it("writes the mocks and an empty list for subjects without a mock", () => {
    seed("2026-10-30")
    expect(read("routes")).toEqual(routes)
    expect(read("trips").length).toBeGreaterThan(0)
    expect(read("trips").every((t) => t.direction === "outbound")).toBe(true)
    expect(read("returnCalls")).toEqual([])
  })

  it("resolves relative dates on the seed day, leaving no token behind", () => {
    seed("2026-10-30")
    expect(read("singleTripOffers")[0].date).toBe("2026-11-02")
    const hand = read("absences").filter((a) => ["abs-lia", "abs-tiago"].includes(a.id))
    expect(hand.map((a) => a.date)).toEqual(["2026-11-02", "2026-11-02"])
    expect(read("absences").find((a) => a.id === "abs-lia")?.reportedAt).toBe("2026-10-29T19:30:00-03:00")
    for (const s of subjects) {
      for (const record of read(s) as unknown as Record<string, unknown>[]) {
        for (const v of Object.values(record)) {
          if (typeof v === "string") expect(v).not.toMatch(TOKEN)
        }
      }
    }
  })

  it("anchors next-trip on the next route day after the seed day", () => {
    seed("2026-10-26")
    expect(read("singleTripOffers")[0].date).toBe("2026-10-27")
  })

  it("does not re-anchor data already stored, even after a reload", async () => {
    seed("2026-10-26")
    vi.resetModules()
    const reloaded = await import("./storage")
    reloaded.seed("2026-10-30")
    expect(reloaded.read("singleTripOffers")[0].date).toBe("2026-10-27")
  })
})

describe("read", () => {
  it("seeds on the real today when nothing was stored", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 30, 23, 30))
    expect(read("singleTripOffers")[0].date).toBe("2026-11-02")
  })

  it("falls back to the mocks when the stored JSON is corrupted", () => {
    seed("2026-10-30")
    fake.map.set("vandi:v2:routes", "{not json")
    expect(read("routes")).toEqual(routes)
  })
})

describe("write", () => {
  it("persists under vandi:v2:<subject> and survives a reload", async () => {
    seed("2026-10-30")
    write("routes", changedRoutes)
    expect(read("routes")).toEqual(changedRoutes)
    expect(fake.map.get("vandi:v2:routes")).toBe(JSON.stringify(changedRoutes))
    vi.resetModules()
    const reloaded = await import("./storage")
    expect(reloaded.read("routes")).toEqual(changedRoutes)
  })

  it("keeps the value in memory when setItem throws", () => {
    vi.stubGlobal("localStorage", makeFake({ setItem: () => { throw new Error("quota") } }))
    expect(() => write("routes", changedRoutes)).not.toThrow()
    expect(read("routes")).toEqual(changedRoutes)
  })
})

describe("without localStorage", () => {
  it("reads the mocks and keeps writes in memory", () => {
    vi.stubGlobal("localStorage", undefined)
    expect(read("routes")).toEqual(routes)
    write("routes", changedRoutes)
    expect(read("routes")).toEqual(changedRoutes)
  })
})

describe("session", () => {
  it("stores the account id and removes the key with null", () => {
    writeSession("op-carlos")
    expect(readSession()).toBe("op-carlos")
    writeSession(null)
    expect(readSession()).toBeNull()
    expect(fake.map.has("vandi:v2:session")).toBe(false)
  })
})

describe("clearAll", () => {
  it("removes every vandi:v2:* key, keeps foreign keys and returns true", () => {
    seed("2026-10-30")
    writeSession("op-carlos")
    fake.map.set("theme", "dark")
    write("routes", changedRoutes)
    expect(clearAll()).toBe(true)
    expect([...fake.map.keys()]).toEqual(["theme"])
    expect(read("routes")).toEqual(routes)
  })

  it("returns false when removeItem throws", () => {
    vi.stubGlobal("localStorage", makeFake({ removeItem: () => { throw new Error("blocked") } }))
    expect(clearAll()).toBe(false)
  })
})

// ---- eight-week history (S1) ----

const weekdayOf = (date: string): Weekday => WEEKDAYS[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7]
const dayOf = (iso: string) => iso.slice(0, 10)
const handIds = new Set<string>([...handAbsences, ...handOffers, ...handBookings].map((r) => r.id))
const supportIds = new Set(accounts.filter((a) => a.role === "student" && a.password === "").map((a) => a.id))
const tripsOf = (routeId: string) => read("trips").filter((t) => t.routeId === routeId)

describe("history seed", () => {
  it("seeds 8 weeks up to today on a Tuesday, only on route weekdays", () => {
    seed("2026-10-27")
    expect(tripsOf("route-carlos")).toHaveLength(37)
    expect(tripsOf("route-ana")).toHaveLength(22)
    expect(tripsOf("route-marcia")).toHaveLength(22)
    for (const t of read("trips")) {
      expect(t.date >= "2026-09-07" && t.date <= "2026-10-27").toBe(true)
      const route = routes.find((r) => r.id === t.routeId)!
      expect(route.weekdays).toContain(weekdayOf(t.date))
    }
  })

  it("resolves the week token against the Monday of today's week", () => {
    seed("2026-10-27")
    expect(read("trips").find((t) => t.id === "trip-carlos-w3-fri")?.date).toBe("2026-10-09")
    expect(read("trips").find((t) => t.id === "trip-carlos-w7-mon")?.date).toBe("2026-09-07")
    expect(read("trips").find((t) => t.id === "trip-carlos-w0-tue")?.date).toBe("2026-10-27")
  })

  it("resolves the week token on other days of the week", () => {
    seed("2026-11-04")
    expect(read("trips").find((t) => t.id === "trip-carlos-w0-mon")?.date).toBe("2026-11-02")
    expect(read("trips").find((t) => t.id === "trip-carlos-w0-wed")?.date).toBe("2026-11-04")
    expect(read("trips").find((t) => t.id === "trip-carlos-w0-thu")).toBeUndefined()
    expect(read("trips").find((t) => t.id === "trip-carlos-w7-mon")?.date).toBe("2026-09-14")
  })

  it("keeps the current week only up to today on a Monday", () => {
    seed("2026-10-26")
    const current = tripsOf("route-carlos").filter((t) => t.date >= "2026-10-26")
    expect(current).toHaveLength(1)
    expect(current[0].date).toBe("2026-10-26")
  })

  it("shows the whole Mon-Fri week on a Saturday", () => {
    seed("2026-10-31")
    expect(tripsOf("route-carlos").filter((t) => t.date >= "2026-10-26")).toHaveLength(5)
  })

  it("treats a Sunday as the end of the week that just ended", () => {
    seed("2026-11-01")
    const trips = tripsOf("route-carlos")
    expect(trips).toHaveLength(40)
    expect(trips.every((t) => t.date <= "2026-10-31")).toBe(true)
    expect(trips.every((t) => new Date(`${t.date}T00:00:00Z`).getUTCDay() !== 0)).toBe(true)
  })

  it("never seeds a history record dated after today", () => {
    seed("2026-10-27")
    const history = <T extends { id: string }>(list: T[]) => list.filter((r) => !handIds.has(r.id))
    for (const a of history(read("absences"))) {
      expect(a.date <= "2026-10-27").toBe(true)
      expect(dayOf(a.reportedAt) <= "2026-10-27").toBe(true)
    }
    const offers = history(read("singleTripOffers"))
    expect(offers.length).toBeGreaterThan(0)
    for (const o of offers) {
      expect(o.date <= "2026-10-27").toBe(true)
      expect(dayOf(o.createdAt) <= "2026-10-27").toBe(true)
    }
    const allOffers = read("singleTripOffers")
    const bookings = history(read("singleTripBookings"))
    expect(bookings.length).toBeGreaterThan(0)
    for (const b of bookings) {
      expect(allOffers.some((o) => o.id === b.offerId)).toBe(true)
      expect(dayOf(b.createdAt) <= "2026-10-27").toBe(true)
    }
  })

  it("resolves a time suffix to a same-day ISO timestamp", () => {
    seed("2026-10-27")
    const absence = read("absences").find((a) => !handIds.has(a.id))!
    expect(absence.reportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00-03:00$/)
    expect(dayOf(absence.reportedAt)).toBe(absence.date)
  })

  it("appends the history after the hand-written records", () => {
    seed("2026-10-27")
    expect(read("singleTripOffers")[0].id).toBe("offer-carlos")
    expect(read("absences").slice(0, handAbsences.length).map((a) => a.id)).toEqual(handAbsences.map((a) => a.id))
    expect(read("singleTripBookings").slice(0, handBookings.length).map((b) => b.id)).toEqual(
      handBookings.map((b) => b.id),
    )
    expect(read("absences").length).toBeGreaterThan(handAbsences.length)
    expect(read("singleTripBookings").length).toBeGreaterThan(handBookings.length)
  })

  it("keeps the hand-written next-trip mocks as before", () => {
    seed("2026-10-27")
    const next = getNextTripDate(routes.find((r) => r.id === "route-carlos")!.weekdays as Weekday[], "2026-10-27")
    expect(next).toBe("2026-10-28")
    for (const id of ["abs-lia", "abs-tiago"]) expect(read("absences").find((a) => a.id === id)?.date).toBe(next)
    expect(read("singleTripOffers").find((o) => o.id === "offer-carlos")?.date).toBe(next)
    expect(read("singleTripBookings").find((b) => b.id === "booking-gustavo")?.status).toBe("paid")
    expect(read("singleTripBookings").find((b) => b.id === "booking-julia")?.status).toBe("pending")
  })

  it("uses only support students in the history", () => {
    seed("2026-10-27")
    const records = [...read("absences"), ...read("singleTripBookings")].filter((r) => !handIds.has(r.id))
    expect(records.length).toBeGreaterThan(0)
    for (const r of records) expect(supportIds.has(r.studentId)).toBe(true)
  })

  it("makes Friday the weekday with the highest absence rate, per route and overall", () => {
    seed("2026-10-27")
    const confirmed = (routeId: string) =>
      read("enrollments").filter((e) => e.routeId === routeId && e.status === "confirmed").length
    const rates = (ids: string[]) => {
      const abs: Record<string, number> = {}
      const cap: Record<string, number> = {}
      for (const t of read("trips")) {
        if (!ids.includes(t.routeId)) continue
        const d = weekdayOf(t.date)
        cap[d] = (cap[d] ?? 0) + confirmed(t.routeId)
        abs[d] = abs[d] ?? 0
      }
      for (const a of read("absences")) {
        if (handIds.has(a.id) || !ids.includes(a.routeId)) continue
        abs[weekdayOf(a.date)] += 1
      }
      return Object.fromEntries(Object.keys(cap).map((d) => [d, abs[d] / cap[d]]))
    }
    const groups = [["route-carlos"], ["route-ana"], ["route-marcia"], ["route-carlos", "route-ana", "route-marcia"]]
    for (const ids of groups) {
      const r = rates(ids)
      expect(r.fri).toBeGreaterThan(0)
      for (const d of Object.keys(r)) if (d !== "fri") expect(r.fri).toBeGreaterThan(r[d])
    }
  })

  it("stores under vandi:v2 and leaves old vandi:v1 keys alone", () => {
    fake.map.set("vandi:v1:routes", "[]")
    seed("2026-10-27")
    expect(fake.map.has("vandi:v2:trips")).toBe(true)
    expect(read("routes")).toEqual(routes)
    clearAll()
    expect(fake.map.has("vandi:v2:trips")).toBe(false)
    expect(fake.map.has("vandi:v1:routes")).toBe(true)
  })
})
