import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { BoardingList } from "@/types"
import { toInstant } from "./clock"
import { getBoardingList } from "./boarding-list"
import { getSeatBalance } from "./seat-balance"
import { clearAll, read, seed, write } from "./storage"

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

// Never a hand-written offset: the runner may be in any timezone.
const at = (date: string, time: string) => new Date(toInstant(date, time)).toISOString()

const names = (list: { name: string }[]) => list.map((p) => p.name)
const groups = (l: BoardingList) =>
  l.going.map((g) => ({ point: g.boardingPoint.name, passengers: names(g.passengers) }))

describe("getBoardingList outbound", () => {
  it("lists Vou by point in route order, fixed before single, each by name", async () => {
    const list = await getBoardingList("op-carlos", "route-carlos", "outbound", at("2026-10-30", "01:00"))
    expect(list?.date).toBe("2026-10-30")
    expect(list?.leg).toBe("outbound")
    expect(list?.phase).toBe("open")
    expect(groups(list!)).toEqual([
      { point: "Praça da Matriz", passengers: ["Davi Rocha", "Helena Prado", "Igor Matos", "Gustavo Reis"] },
      { point: "Rodoviária de Itu", passengers: ["Caio Mendes", "Fernanda Dias", "Pedro Alves", "Júlia Prado"] },
    ])
    expect(list!.going[0].passengers.map((p) => p.kind)).toEqual(["fixed", "fixed", "fixed", "single"])
    expect(list!.going[1].passengers.map((p) => p.kind)).toEqual(["fixed", "fixed", "fixed", "single"])
  })

  it("separates Não vou from Sem resposta before −12 h", async () => {
    const list = await getBoardingList("op-carlos", "route-carlos", "outbound", at("2026-10-30", "01:00"))
    expect(names(list!.notGoing)).toEqual(["Júlia Neves", "Lia Ferraz", "Tiago Reis"])
    expect(list!.notGoing.every((p) => !p.noResponse)).toBe(true)
    expect(names(list!.noResponse)).toEqual(["Marcos Lima", "Mateus Lima", "Rafa Souza"])
    expect(list!.noResponse.every((p) => p.noResponse)).toBe(true)
  })

  it("carries the seat balance of the route and date", async () => {
    const now = at("2026-10-30", "01:00")
    const list = await getBoardingList("op-carlos", "route-carlos", "outbound", now)
    expect(list?.route.id).toBe("route-carlos")
    expect(list?.balance).toEqual(await getSeatBalance("route-carlos", "2026-10-30", now))
  })

  it("moves Sem resposta to Não vou, with the seal, from −12 h", async () => {
    const list = await getBoardingList("op-carlos", "route-carlos", "outbound", at("2026-10-30", "06:00"))
    expect(list?.phase).toBe("after_deadline")
    expect(list!.noResponse).toEqual([])
    const sealed = list!.notGoing.filter((p) => p.noResponse)
    expect(names(sealed).sort()).toEqual(["Marcos Lima", "Mateus Lima", "Rafa Souza"])
    expect(names(list!.notGoing).sort()).toEqual(
      ["Júlia Neves", "Lia Ferraz", "Marcos Lima", "Mateus Lima", "Rafa Souza", "Tiago Reis"],
    )
    expect(groups(list!).flatMap((g) => g.passengers)).not.toContain("Mateus Lima")
  })
})

describe("getBoardingList return", () => {
  it("lists who comes back, with the day passes for #10", async () => {
    const list = await getBoardingList("op-carlos", "route-carlos", "return", at("2026-10-30", "01:00"))
    expect(list?.leg).toBe("return")
    const going = list!.going.flatMap((g) => g.passengers)
    expect(names(going)).toContain("Júlia Neves")
    expect(names(list!.notGoing)).toContain("Igor Matos")
    expect(names(going)).not.toContain("Igor Matos")
    const singles = going.filter((p) => p.kind === "single")
    expect(names(singles).sort()).toEqual(["Gustavo Reis", "Júlia Prado"])
    expect(names(list!.notGoing)).not.toContain("Júlia Neves")
  })
})

describe("getBoardingList day pass holders", () => {
  it("never puts a diária student in Não vou or Sem resposta", async () => {
    for (const time of ["01:00", "06:00"]) {
      for (const leg of ["outbound", "return"] as const) {
        const list = await getBoardingList("op-carlos", "route-carlos", leg, at("2026-10-30", time))
        const out = [...names(list!.notGoing), ...names(list!.noResponse)]
        expect(out).not.toContain("Gustavo Reis")
        expect(out).not.toContain("Júlia Prado")
      }
    }
  })

  it("does not list a cancelled booking", async () => {
    write("singleTripBookings", read("singleTripBookings").map((b) =>
      b.id === "booking-gustavo" ? { ...b, status: "cancelled" as const } : b))
    const list = await getBoardingList("op-carlos", "route-carlos", "outbound", at("2026-10-30", "01:00"))
    const all = [...list!.going.flatMap((g) => g.passengers), ...list!.notGoing, ...list!.noResponse]
    expect(names(all)).not.toContain("Gustavo Reis")
    expect(names(all)).toContain("Júlia Prado")
  })
})

describe("getBoardingList ownership", () => {
  it("is null for a route of another operator", async () => {
    expect(await getBoardingList("op-ana", "route-carlos", "outbound", at("2026-10-30", "01:00"))).toBeNull()
  })

  it("is null for a student id", async () => {
    expect(await getBoardingList("st-mateus-lima", "route-carlos", "outbound", at("2026-10-30", "01:00"))).toBeNull()
  })

  it("is null for an unknown route", async () => {
    expect(await getBoardingList("op-carlos", "route-x", "outbound", at("2026-10-30", "01:00"))).toBeNull()
  })
})
