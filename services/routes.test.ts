import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import routesMock from "@/mocks/routes.json"
import type { NewRouteFieldErrors, NewRouteInput } from "@/types"
import { clearAll, read, seed, write } from "./storage"
import { createRoute, listOperatorRoutes, occupiedSeats } from "./routes"
import { restoreDemoData } from "./session"

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

const valid: NewRouteInput = {
  origin: "  Sorocaba ",
  weekdays: ["fri", "mon", "tue", "wed", "thu"],
  outboundTime: "17:30",
  returnTime: "22:40",
  seats: "12",
  monthlyPrice: "R$ 350,00",
  boardingPoints: [
    { name: " Terminal Santo Antônio ", time: "17:30" },
    { name: "Praça Coronel Fernando Prestes", time: "17:45" },
  ],
}

async function errorsOf(change: Partial<NewRouteInput>): Promise<NewRouteFieldErrors> {
  const result = await createRoute("op-carlos", { ...valid, ...change })
  return result.ok ? {} : (result.fieldErrors ?? {})
}

describe("createRoute validation", () => {
  it("an empty origin is refused with the message in the field and in error", async () => {
    const result = await createRoute("op-carlos", { ...valid, origin: "   " })
    expect(result).toEqual({
      ok: false,
      error: "Digite a cidade de onde a van sai.",
      fieldErrors: { origin: "Digite a cidade de onde a van sai." },
    })
  })

  it("no weekday is refused", async () => {
    expect((await errorsOf({ weekdays: [] })).weekdays).toBe("Escolha pelo menos um dia.")
  })

  it.each(["", "25:00"])("outbound time %j is refused and the return time is not compared", async (outboundTime) => {
    const errors = await errorsOf({ outboundTime })
    expect(errors.outboundTime).toBe("Escolha o horário de ida.")
    expect(errors.returnTime).toBeUndefined()
  })

  it("an empty return time is refused", async () => {
    expect((await errorsOf({ returnTime: "" })).returnTime).toBe("Escolha o horário de volta.")
  })

  it.each(["17:30", "08:00"])("a return at %s, not after the outbound, is refused", async (returnTime) => {
    expect((await errorsOf({ returnTime })).returnTime).toBe("A volta tem que ser depois da ida.")
  })

  it.each(["", "0", "-1", "1,5", "abc"])("seats %j is refused", async (seats) => {
    expect((await errorsOf({ seats })).seats).toBe("Informe quantos lugares a van tem, de 1 em diante.")
  })

  it.each(["1", "60"])("seats %j is accepted (no ceiling)", async (seats) => {
    expect((await errorsOf({ seats })).seats).toBeUndefined()
  })

  it.each(["", "0", "0,00", "R$ 0,00", "-10", "abc"])("monthly price %j is refused", async (monthlyPrice) => {
    expect((await errorsOf({ monthlyPrice })).monthlyPrice).toBe("Informe a mensalidade, maior que zero.")
  })

  it("no boarding point is refused, with no row errors", async () => {
    const errors = await errorsOf({ boardingPoints: [] })
    expect(errors.boardingPoints).toBe("Adicione pelo menos um ponto de embarque.")
    expect(errors.boardingPointRows).toBeUndefined()
  })

  it("invalid point rows are reported by index, `{}` for a valid row", async () => {
    const errors = await errorsOf({
      boardingPoints: [
        { name: "  ", time: "17:30" },
        { name: "Ok", time: "" },
        { name: "Ok", time: "17:40" },
      ],
    })
    expect(errors.boardingPointRows).toEqual([
      { name: "Digite o nome do ponto." },
      { time: "Escolha o horário do ponto." },
      {},
    ])
  })

  it("everything invalid reports every field, error is the first in form order, and nothing is written", async () => {
    const result = await createRoute("op-carlos", {
      origin: "",
      weekdays: [],
      outboundTime: "",
      returnTime: "",
      seats: "0",
      monthlyPrice: "",
      boardingPoints: [{ name: "", time: "" }],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Object.keys(result.fieldErrors ?? {})).toEqual([
      "origin",
      "weekdays",
      "outboundTime",
      "returnTime",
      "seats",
      "monthlyPrice",
      "boardingPointRows",
    ])
    expect(result.error).toBe("Digite a cidade de onde a van sai.")
    expect(read("routes")).toHaveLength(3)
    expect(read("boardingPoints")).toHaveLength(6)
  })
})

describe("createRoute write", () => {
  it("writes the route and its points, trimmed and with order, and returns the route", async () => {
    const result = await createRoute("op-carlos", valid)
    expect(result).toEqual({
      ok: true,
      data: {
        id: "route-sorocaba",
        operatorId: "op-carlos",
        origin: "Sorocaba",
        destination: "Facens",
        weekdays: ["mon", "tue", "wed", "thu", "fri"],
        outboundTime: "17:30",
        returnTime: "22:40",
        seats: 12,
        monthlyPrice: 35000,
      },
    })
    expect(read("routes").find((r) => r.id === "route-sorocaba")).toEqual(result.ok && result.data)
    expect(read("boardingPoints").filter((p) => p.routeId === "route-sorocaba")).toEqual([
      { id: "bp-sorocaba-terminal-santo-antonio", routeId: "route-sorocaba", name: "Terminal Santo Antônio", time: "17:30", order: 1 },
      { id: "bp-sorocaba-praca-coronel-fernando-prestes", routeId: "route-sorocaba", name: "Praça Coronel Fernando Prestes", time: "17:45", order: 2 },
    ])
  })

  it("the new route shows up in the operator's list with no occupied seats", async () => {
    await createRoute("op-carlos", valid)
    const list = await listOperatorRoutes("op-carlos")
    expect(list.map((r) => r.id)).toEqual(["route-carlos", "route-sorocaba"])
    expect(list[1].occupiedSeats).toBe(0)
  })

  it.each([
    ["350", 35000],
    ["350,00", 35000],
    ["R$ 350,00", 35000],
    ["R$350,5", 35050],
    ["350.50", 35050],
    ["1.200,00", 120000],
  ])("monthly price %j is stored as %i cents", async (monthlyPrice, cents) => {
    const result = await createRoute("op-carlos", { ...valid, monthlyPrice })
    expect(result.ok && result.data.monthlyPrice).toBe(cents)
  })

  it("weekdays are stored in week order", async () => {
    const result = await createRoute("op-carlos", { ...valid, weekdays: ["fri", "mon"] })
    expect(result.ok && result.data.weekdays).toEqual(["mon", "fri"])
  })

  it("ids stay unique: a second route from the same city gets -2, and so do equal point names", async () => {
    const itu = { ...valid, origin: "Itu", boardingPoints: [{ name: "Praça da Matriz", time: "17:30" }] }
    const first = await createRoute("op-carlos", itu)
    const second = await createRoute("op-carlos", itu)
    expect(first.ok && first.data.id).toBe("route-itu")
    expect(second.ok && second.data.id).toBe("route-itu-2")
    expect(read("boardingPoints").map((p) => p.id)).toContain("bp-itu-2-praca-da-matriz")

    await createRoute("op-carlos", {
      ...valid,
      origin: "Salto de Pirapora",
      boardingPoints: [
        { name: "Praça da Matriz", time: "17:30" },
        { name: "Praça da Matriz", time: "17:40" },
      ],
    })
    const ids = read("boardingPoints").filter((p) => p.routeId === "route-salto-de-pirapora").map((p) => p.id)
    expect(ids).toEqual(["bp-salto-de-pirapora-praca-da-matriz", "bp-salto-de-pirapora-praca-da-matriz-2"])
  })

  it("an origin named like a mock operator does not collide with the mock route", async () => {
    const result = await createRoute("op-ana", { ...valid, origin: "Carlos" })
    expect(result.ok && result.data.id).toBe("route-carlos-2")
    expect(read("routes").find((r) => r.id === "route-carlos")?.operatorId).toBe("op-carlos")
  })

  it("a new operator sees only their own route, and Carlos does not see it", async () => {
    await createRoute("op-julia-avila", valid)
    expect((await listOperatorRoutes("op-julia-avila")).map((r) => r.id)).toEqual(["route-sorocaba"])
    expect((await listOperatorRoutes("op-carlos")).map((r) => r.id)).toEqual(["route-carlos"])
  })

  it("restoring the demo data removes the created routes", async () => {
    await createRoute("op-julia-avila", valid)
    await restoreDemoData("2026-10-30")
    expect(read("routes")).toEqual(routesMock)
    expect(await listOperatorRoutes("op-julia-avila")).toEqual([])
  })
})
