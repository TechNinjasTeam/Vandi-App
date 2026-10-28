import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Enrollment, EnrollmentStatus } from "@/types"
import { clearAll, read, seed, write } from "./storage"
import { occupiedSeats } from "./routes"
import { confirmSeat, countPendingRequests, getMyRoute, requestSeat, withdrawRequest } from "./enrollments"

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

const NOW = "2026-10-30T10:00:00-03:00"

const setStatus = (id: string, status: EnrollmentStatus) =>
  write("enrollments", read("enrollments").map((e) => (e.id === id ? { ...e, status } : e)))
const statusOf = (id: string) => read("enrollments").find((e) => e.id === id)?.status

describe("countPendingRequests", () => {
  it("counts only requested enrollments on the operator's routes", async () => {
    expect(await countPendingRequests("op-carlos")).toBe(4)
    expect(await countPendingRequests("op-ana")).toBe(0)
  })
})

describe("requestSeat", () => {
  it("writes a requested enrollment that does not take a seat yet", async () => {
    const result = await requestSeat("st-rafael-moura", "route-carlos", "bp-carlos-matriz", NOW)
    expect(result).toMatchObject({
      ok: true,
      data: {
        routeId: "route-carlos", studentId: "st-rafael-moura", boardingPointId: "bp-carlos-matriz",
        status: "requested", requestedAt: NOW,
      },
    })
    const data = (result as { data: Enrollment }).data
    expect(data.id.startsWith("enr-")).toBe(true)
    expect(read("enrollments")).toContainEqual(data)
    expect(await occupiedSeats("route-carlos")).toBe(12)
    expect(await countPendingRequests("op-carlos")).toBe(5)
  })

  it.each([
    ["an operator", "op-carlos", "route-carlos", "bp-carlos-matriz", "Só aluno pode pedir vaga."],
    ["an unknown account", "st-x", "route-carlos", "bp-carlos-matriz", "Só aluno pode pedir vaga."],
    ["a route that does not exist", "st-rafael-moura", "route-x", "bp-carlos-matriz", "Essa van não existe mais."],
    ["a point of another route", "st-rafael-moura", "route-carlos", "bp-ana-igreja", "Escolha um ponto desta van."],
    ["a student who already has a confirmed seat", "st-mateus-lima", "route-ana", "bp-ana-igreja", "Você já tem vaga fixa."],
    ["a repeated request (requested)", "st-beatriz-campos", "route-carlos", "bp-carlos-matriz", "Você já pediu vaga nesta van."],
    ["a repeated request (accepted)", "st-laura-bastos", "route-ana", "bp-ana-igreja", "Você já pediu vaga nesta van."],
    ["a full van", "st-rafael-moura", "route-marcia", "bp-marcia-bom-jesus", "Essa van está lotada."],
  ])("%s: error and nothing written", async (_name, studentId, routeId, pointId, error) => {
    const before = read("enrollments")
    expect(await requestSeat(studentId, routeId, pointId, NOW)).toEqual({ ok: false, error })
    expect(read("enrollments")).toEqual(before)
  })

  it("checks in spec order: route, point, confirmed seat, repeated, full", async () => {
    // route before point
    expect(await requestSeat("st-rafael-moura", "route-x", "bp-x", NOW)).toEqual({ ok: false, error: "Essa van não existe mais." })
    // point before confirmed seat
    expect(await requestSeat("st-mateus-lima", "route-carlos", "bp-ana-igreja", NOW)).toEqual({ ok: false, error: "Escolha um ponto desta van." })
    // confirmed seat before full
    expect(await requestSeat("st-mateus-lima", "route-marcia", "bp-marcia-bom-jesus", NOW)).toEqual({ ok: false, error: "Você já tem vaga fixa." })
    // repeated before full
    write("routes", read("routes").map((r) => (r.id === "route-carlos" ? { ...r, seats: 12 } : r)))
    expect(await requestSeat("st-beatriz-campos", "route-carlos", "bp-carlos-matriz", NOW)).toEqual({ ok: false, error: "Você já pediu vaga nesta van." })
  })

  it.each(["declined", "cancelled"] as const)("a %s enrollment does not stop a new request on the same van", async (status) => {
    setStatus("enr-beatriz-campos", status)
    const result = await requestSeat("st-beatriz-campos", "route-carlos", "bp-carlos-matriz", NOW)
    expect(result.ok).toBe(true)
    expect((result as { data: Enrollment }).data.id).not.toBe("enr-beatriz-campos")
    expect(statusOf("enr-beatriz-campos")).toBe(status)
  })

  it("a student can request several vans while nothing is confirmed", async () => {
    expect((await requestSeat("st-rafael-moura", "route-carlos", "bp-carlos-matriz", NOW)).ok).toBe(true)
    expect((await requestSeat("st-rafael-moura", "route-ana", "bp-ana-igreja", NOW)).ok).toBe(true)
    expect(read("enrollments").filter((e) => e.studentId === "st-rafael-moura")).toHaveLength(2)
  })

  it("a repeated request writes only one enrollment", async () => {
    await requestSeat("st-rafael-moura", "route-carlos", "bp-carlos-matriz", NOW)
    expect((await requestSeat("st-rafael-moura", "route-carlos", "bp-carlos-matriz", NOW)).ok).toBe(false)
    expect(read("enrollments").filter((e) => e.studentId === "st-rafael-moura")).toHaveLength(1)
  })
})

describe("confirmSeat", () => {
  it("confirms the accepted enrollment and cancels the student's other request", async () => {
    const result = await confirmSeat("st-laura-bastos", "enr-laura-bastos-ana")
    expect(result).toMatchObject({ ok: true, data: { id: "enr-laura-bastos-ana", status: "confirmed" } })
    expect(statusOf("enr-laura-bastos-ana")).toBe("confirmed")
    expect(statusOf("enr-laura-bastos-carlos")).toBe("cancelled")
    expect(await occupiedSeats("route-ana")).toBe(9)
    expect(await countPendingRequests("op-carlos")).toBe(3)
  })

  it("cancels another accepted enrollment of the student too, freeing its seat", async () => {
    setStatus("enr-laura-bastos-carlos", "accepted")
    expect(await occupiedSeats("route-carlos")).toBe(13)
    await confirmSeat("st-laura-bastos", "enr-laura-bastos-ana")
    expect(statusOf("enr-laura-bastos-carlos")).toBe("cancelled")
    expect(await occupiedSeats("route-carlos")).toBe(12)
  })

  it("does not touch other students' enrollments", async () => {
    const others = read("enrollments").filter((e) => e.studentId !== "st-laura-bastos")
    await confirmSeat("st-laura-bastos", "enr-laura-bastos-ana")
    expect(read("enrollments").filter((e) => e.studentId !== "st-laura-bastos")).toEqual(others)
  })

  it("after confirming, the student can no longer request a seat", async () => {
    await confirmSeat("st-laura-bastos", "enr-laura-bastos-ana")
    expect(await requestSeat("st-laura-bastos", "route-carlos", "bp-carlos-matriz", NOW)).toEqual({
      ok: false, error: "Você já tem vaga fixa.",
    })
  })

  it("only an accepted enrollment can be confirmed: nothing written", async () => {
    const before = read("enrollments")
    expect(await confirmSeat("st-laura-bastos", "enr-laura-bastos-carlos")).toEqual({
      ok: false, error: "Só dá pra ficar com uma van que aceitou seu pedido.",
    })
    expect(read("enrollments")).toEqual(before)
  })

  it.each([
    ["another student's enrollment", "st-rafael-moura", "enr-laura-bastos-ana"],
    ["an enrollment that does not exist", "st-laura-bastos", "enr-x"],
    ["an operator", "op-ana", "enr-laura-bastos-ana"],
  ])("%s: Pedido não encontrado, nothing written", async (_name, studentId, enrollmentId) => {
    const before = read("enrollments")
    expect(await confirmSeat(studentId, enrollmentId)).toEqual({ ok: false, error: "Pedido não encontrado." })
    expect(read("enrollments")).toEqual(before)
  })
})

describe("withdrawRequest", () => {
  it("withdrawing an accepted enrollment cancels it and frees the seat", async () => {
    const result = await withdrawRequest("st-laura-bastos", "enr-laura-bastos-ana")
    expect(result).toMatchObject({ ok: true, data: { id: "enr-laura-bastos-ana", status: "cancelled" } })
    expect(statusOf("enr-laura-bastos-ana")).toBe("cancelled")
    expect(await occupiedSeats("route-ana")).toBe(8)
  })

  it("withdrawing a requested enrollment cancels it and drops the operator's pending count", async () => {
    expect((await withdrawRequest("st-beatriz-campos", "enr-beatriz-campos")).ok).toBe(true)
    expect(statusOf("enr-beatriz-campos")).toBe("cancelled")
    expect(await countPendingRequests("op-carlos")).toBe(3)
  })

  it("only that enrollment changes", async () => {
    await withdrawRequest("st-laura-bastos", "enr-laura-bastos-ana")
    expect(statusOf("enr-laura-bastos-carlos")).toBe("requested")
  })

  it.each(["confirmed", "declined", "cancelled"] as const)("a %s enrollment cannot be withdrawn: nothing written", async (status) => {
    setStatus("enr-beatriz-campos", status)
    const before = read("enrollments")
    expect(await withdrawRequest("st-beatriz-campos", "enr-beatriz-campos")).toEqual({
      ok: false, error: "Não dá pra desistir desse pedido.",
    })
    expect(read("enrollments")).toEqual(before)
  })

  it.each([
    ["another student's enrollment", "st-rafael-moura", "enr-beatriz-campos"],
    ["an enrollment that does not exist", "st-beatriz-campos", "enr-x"],
    ["an operator", "op-carlos", "enr-beatriz-campos"],
  ])("%s: Pedido não encontrado, nothing written", async (_name, studentId, enrollmentId) => {
    const before = read("enrollments")
    expect(await withdrawRequest(studentId, enrollmentId)).toEqual({ ok: false, error: "Pedido não encontrado." })
    expect(read("enrollments")).toEqual(before)
  })
})

describe("getMyRoute", () => {
  it("a student with nothing has nothing to list", async () => {
    expect(await getMyRoute("st-rafael-moura")).toBeNull()
  })

  it("a confirmed seat comes with route, operator contact and boarding point", async () => {
    expect(await getMyRoute("st-mateus-lima")).toMatchObject({
      kind: "confirmed",
      enrollment: {
        id: "enr-mateus-lima", status: "confirmed", operatorName: "Carlos Almeida", operatorPhone: "(11) 90000-0040",
        route: { id: "route-carlos" }, boardingPoint: { name: "Praça da Matriz" },
      },
    })
  })

  it("without a confirmed seat, lists requested and accepted, newest first", async () => {
    const mine = await getMyRoute("st-laura-bastos")
    expect(mine?.kind).toBe("requests")
    if (mine?.kind !== "requests") return
    expect(mine.enrollments.map((e) => e.id)).toEqual(["enr-laura-bastos-carlos", "enr-laura-bastos-ana"])
    expect(mine.enrollments[1]).toMatchObject({ status: "accepted", operatorName: "Ana Ribeiro", route: { id: "route-ana" } })
  })

  it("after confirming, shows the confirmed seat", async () => {
    await confirmSeat("st-laura-bastos", "enr-laura-bastos-ana")
    expect(await getMyRoute("st-laura-bastos")).toMatchObject({ kind: "confirmed", enrollment: { id: "enr-laura-bastos-ana" } })
  })

  it("a declined enrollment is listed", async () => {
    setStatus("enr-beatriz-campos", "declined")
    const mine = await getMyRoute("st-beatriz-campos")
    expect(mine?.kind).toBe("requests")
    if (mine?.kind !== "requests") return
    expect(mine.enrollments.map((e) => [e.id, e.status])).toEqual([["enr-beatriz-campos", "declined"]])
  })

  it("a cancelled enrollment is never listed", async () => {
    setStatus("enr-beatriz-campos", "cancelled")
    expect(await getMyRoute("st-beatriz-campos")).toBeNull()
  })

  it("a cancelled enrollment is left out of a list that still has others", async () => {
    setStatus("enr-laura-bastos-carlos", "cancelled")
    const mine = await getMyRoute("st-laura-bastos")
    expect(mine?.kind).toBe("requests")
    if (mine?.kind !== "requests") return
    expect(mine.enrollments.map((e) => e.id)).toEqual(["enr-laura-bastos-ana"])
  })
})
