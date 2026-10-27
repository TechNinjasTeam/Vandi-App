import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { NewRouteFieldErrors, NewRouteInput } from "@/types"
import { clearAll, read, seed, write } from "./storage"
import { createRoute, listOperatorRoutes, occupiedSeats } from "./routes"

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
