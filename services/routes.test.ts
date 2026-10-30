import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import routesMock from "@/mocks/routes.json"
import type { NewRouteFieldErrors, NewRouteInput, Weekday } from "@/types"
import { clearAll, read, seed, write } from "./storage"
import {
  POINT_IN_USE, createRoute, formatMonthlyPrice, formatWeekdays, getOperatorRoute, listOperatorRoutes, occupiedSeats, updateRoute,
} from "./routes"
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
    ["route-carlos", 12], // its requested enrollments are not counted
    ["route-ana", 9],
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
    expect(await occupiedSeats("route-ana")).toBe(9)
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

describe("formatWeekdays", () => {
  it.each<[Weekday[], string]>([
    [["mon", "tue", "wed", "thu", "fri"], "seg a sex"],
    [["mon", "wed", "fri"], "seg, qua, sex"],
    [["mon", "tue"], "seg a ter"],
    [["mon", "tue", "wed", "thu", "fri", "sat"], "seg a sáb"],
    [["sat"], "sáb"],
    [["fri", "mon", "tue"], "seg, ter, sex"], // unordered input is sorted, and not contiguous
  ])("%j reads %j", (weekdays, label) => {
    expect(formatWeekdays(weekdays)).toBe(label)
  })
})

const carlos: NewRouteInput = {
  origin: "Itu",
  weekdays: ["mon", "tue", "wed", "thu", "fri"],
  outboundTime: "17:50",
  returnTime: "22:50",
  seats: "15",
  monthlyPrice: "380",
  boardingPoints: [
    { id: "bp-carlos-matriz", name: "Praça da Matriz", time: "17:50" },
    { id: "bp-carlos-rodoviaria", name: "Rodoviária de Itu", time: "18:00" },
  ],
}

function snapshot() {
  return { routes: read("routes"), boardingPoints: read("boardingPoints"), enrollments: read("enrollments") }
}

describe("getOperatorRoute", () => {
  it("returns the owner's route with sorted points, seats and the points with active enrollments", async () => {
    write("boardingPoints", [...read("boardingPoints")].reverse())
    const route = await getOperatorRoute("op-carlos", "route-carlos")
    expect(route).toMatchObject({ id: "route-carlos", occupiedSeats: 12 })
    expect(route?.boardingPoints.map((p) => p.id)).toEqual(["bp-carlos-matriz", "bp-carlos-rodoviaria"])
    expect([...(route?.pointsInUse ?? [])].sort()).toEqual(["bp-carlos-matriz", "bp-carlos-rodoviaria"])
  })

  it("another operator's route and a missing route are null", async () => {
    expect(await getOperatorRoute("op-ana", "route-carlos")).toBeNull()
    expect(await getOperatorRoute("op-carlos", "route-x")).toBeNull()
  })

  it("a route without enrollments has no point in use", async () => {
    const created = await createRoute("op-carlos", valid)
    const route = await getOperatorRoute("op-carlos", created.ok ? created.data.id : "")
    expect(route?.pointsInUse).toEqual([])
  })

  it("only requested, accepted and confirmed enrollments put a point in use", async () => {
    write("enrollments", read("enrollments").map((e) =>
      e.boardingPointId === "bp-carlos-rodoviaria" ? { ...e, status: "cancelled" as const } : e,
    ))
    expect((await getOperatorRoute("op-carlos", "route-carlos"))?.pointsInUse).toEqual(["bp-carlos-matriz"])
    write("enrollments", read("enrollments").map((e) =>
      e.boardingPointId === "bp-carlos-matriz" ? { ...e, status: "declined" as const } : e,
    ))
    expect((await getOperatorRoute("op-carlos", "route-carlos"))?.pointsInUse).toEqual([])
  })
})

describe("updateRoute", () => {
  it("saves the changes, keeps the route and the kept points' ids, and gives the new point an id", async () => {
    const enrollments = read("enrollments")
    const result = await updateRoute("op-carlos", "route-carlos", {
      ...carlos,
      monthlyPrice: "400",
      boardingPoints: [
        { id: "bp-carlos-matriz", name: "Praça Matriz", time: "17:55" },
        { id: "bp-carlos-rodoviaria", name: "Rodoviária de Itu", time: "18:00" },
        { name: "Posto Shell", time: "18:10" },
      ],
    })
    expect(result).toEqual({
      ok: true,
      data: {
        id: "route-carlos",
        operatorId: "op-carlos",
        origin: "Itu",
        destination: "Facens",
        weekdays: ["mon", "tue", "wed", "thu", "fri"],
        outboundTime: "17:50",
        returnTime: "22:50",
        seats: 15,
        monthlyPrice: 40000,
      },
    })
    expect(read("routes").find((r) => r.id === "route-carlos")).toEqual(result.ok && result.data)
    expect(read("boardingPoints")).toHaveLength(7)
    expect(read("boardingPoints").filter((p) => p.routeId === "route-carlos")).toEqual([
      { id: "bp-carlos-matriz", routeId: "route-carlos", name: "Praça Matriz", time: "17:55", order: 1 },
      { id: "bp-carlos-rodoviaria", routeId: "route-carlos", name: "Rodoviária de Itu", time: "18:00", order: 2 },
      { id: "bp-carlos-posto-shell", routeId: "route-carlos", name: "Posto Shell", time: "18:10", order: 3 },
    ])
    expect(read("enrollments")).toEqual(enrollments)
  })

  it("points sent in another order keep their ids and swap their order; the origin can change", async () => {
    const result = await updateRoute("op-carlos", "route-carlos", {
      ...carlos,
      origin: "Salto",
      boardingPoints: [...carlos.boardingPoints].reverse(),
    })
    expect(result.ok && result.data).toMatchObject({ id: "route-carlos", origin: "Salto" })
    const points = read("boardingPoints").filter((p) => p.routeId === "route-carlos")
    expect(points.find((p) => p.id === "bp-carlos-rodoviaria")?.order).toBe(1)
    expect(points.find((p) => p.id === "bp-carlos-matriz")?.order).toBe(2)
  })

  it("a point id of another route does not take that point over: it becomes a new point", async () => {
    const anaPoints = read("boardingPoints").filter((p) => p.routeId === "route-ana")
    const result = await updateRoute("op-carlos", "route-carlos", {
      ...carlos,
      boardingPoints: [...carlos.boardingPoints, { id: "bp-ana-igreja", name: "Posto Shell", time: "18:10" }],
    })
    expect(result.ok).toBe(true)
    expect(read("boardingPoints").filter((p) => p.routeId === "route-ana")).toEqual(anaPoints)
    expect(read("boardingPoints").filter((p) => p.routeId === "route-carlos")).toHaveLength(3)
  })

  it.each([
    ["origin", { origin: "" }, "Digite a cidade de onde a van sai."],
    ["weekdays", { weekdays: [] }, "Escolha pelo menos um dia."],
    ["returnTime", { returnTime: "17:50" }, "A volta tem que ser depois da ida."],
    ["seats", { seats: "0" }, "Informe quantos lugares a van tem, de 1 em diante."],
    ["monthlyPrice", { monthlyPrice: "0" }, "Informe a mensalidade, maior que zero."],
    ["boardingPoints", { boardingPoints: [] }, "Adicione pelo menos um ponto de embarque."],
  ] as const)("invalid %s gets the createRoute message in the field and in error, and nothing is written", async (field, change, message) => {
    const before = snapshot()
    const result = await updateRoute("op-carlos", "route-carlos", { ...carlos, ...change } as NewRouteInput)
    expect(result).toMatchObject({ ok: false, error: message, fieldErrors: { [field]: message } })
    expect(snapshot()).toEqual(before)
  })

  it("seats below the occupied ones are refused, equal is accepted", async () => {
    const before = snapshot()
    const result = await updateRoute("op-carlos", "route-carlos", { ...carlos, seats: "11" })
    expect(result).toMatchObject({ ok: false, error: "Já tem 12 alunos na rota", fieldErrors: { seats: "Já tem 12 alunos na rota" } })
    expect(snapshot()).toEqual(before)

    const equal = await updateRoute("op-carlos", "route-carlos", { ...carlos, seats: "12" })
    expect(equal.ok && equal.data.seats).toBe(12)
  })

  it("seats 0 on a route with a student gets the validation message, not the occupied one", async () => {
    const created = await createRoute("op-carlos", valid)
    const routeId = created.ok ? created.data.id : ""
    write("enrollments", [
      ...read("enrollments"),
      {
        id: "enr-t",
        routeId,
        studentId: "st-t",
        boardingPointId: "bp-sorocaba-terminal-santo-antonio",
        status: "confirmed",
        requestedAt: "2026-10-30T10:00:00-03:00",
      },
    ])
    const result = await updateRoute("op-carlos", routeId, { ...valid, seats: "0" })
    expect(result).toMatchObject({ ok: false, fieldErrors: { seats: "Informe quantos lugares a van tem, de 1 em diante." } })
  })

  it("removing a point with an active enrollment is refused and nothing is written", async () => {
    const before = snapshot()
    const result = await updateRoute("op-carlos", "route-carlos", { ...carlos, boardingPoints: [carlos.boardingPoints[0]] })
    expect(result).toMatchObject({ ok: false, error: POINT_IN_USE, fieldErrors: { boardingPoints: POINT_IN_USE } })
    expect(snapshot()).toEqual(before)
  })

  it("a point without active enrollments can be removed", async () => {
    write("enrollments", read("enrollments").map((e) =>
      e.boardingPointId === "bp-carlos-rodoviaria" ? { ...e, status: "cancelled" as const } : e,
    ))
    const result = await updateRoute("op-carlos", "route-carlos", { ...carlos, boardingPoints: [carlos.boardingPoints[0]] })
    expect(result.ok).toBe(true)
    expect(read("boardingPoints").filter((p) => p.routeId === "route-carlos").map((p) => p.id)).toEqual(["bp-carlos-matriz"])
  })

  it.each([
    ["another operator's route", "op-ana", "route-carlos"],
    ["a missing route", "op-carlos", "route-x"],
  ])("%s is not found, with no field errors, and nothing is written", async (_label, operatorId, routeId) => {
    const before = snapshot()
    expect(await updateRoute(operatorId, routeId, carlos)).toEqual({ ok: false, error: "Rota não encontrada." })
    expect(snapshot()).toEqual(before)
  })
})

describe("formatMonthlyPrice", () => {
  it.each([
    [38000, "R$ 380"],
    [35050, "R$ 350,50"],
    [120000, "R$ 1.200"],
    [5, "R$ 0,05"],
  ])("%i cents read %j", (cents, label) => {
    expect(formatMonthlyPrice(cents)).toBe(label)
  })
})
