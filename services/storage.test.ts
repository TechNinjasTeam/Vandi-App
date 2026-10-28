import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import routes from "@/mocks/routes.json"
import type { Route } from "@/types"
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

const TOKEN = /^(today([+-]\d+)?|next-trip)(T\d{2}:\d{2})?$/
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
    expect(read("trips")).toEqual([])
  })

  it("resolves relative dates on the seed day, leaving no token behind", () => {
    seed("2026-10-30")
    expect(read("singleTripOffers")[0].date).toBe("2026-11-02")
    expect(read("absences").map((a) => a.date)).toEqual(["2026-11-02", "2026-11-02"])
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
