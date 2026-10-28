import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { EnrollmentStatus, NewRouteInput } from "@/types"
import { clearAll, read, seed, write } from "./storage"
import { countPendingRequests } from "./enrollments"
import { acceptRequest, declineRequest, listRequests } from "./requests"
import { createRoute, occupiedSeats } from "./routes"

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

/** Sets the stored status of enrollments, as the student-side services would. */
function setStatus(changes: Record<string, EnrollmentStatus>) {
  write("enrollments", read("enrollments").map((e) => (e.id in changes ? { ...e, status: changes[e.id] } : e)))
}

const statusOf = (id: string) => read("enrollments").find((e) => e.id === id)?.status

const newRoute: NewRouteInput = {
  origin: "Sorocaba",
  weekdays: ["mon"],
  outboundTime: "17:30",
  returnTime: "22:40",
  seats: "12",
  monthlyPrice: "350",
  boardingPoints: [{ name: "Terminal", time: "17:30" }],
}

describe("listRequests", () => {
  it("lists the operator's route with its requested enrollments, oldest first, and the student and point data", async () => {
    const list = await listRequests("op-carlos")
    expect(list).toHaveLength(1)
    expect(list[0].route).toMatchObject({ id: "route-carlos", occupiedSeats: 12 })
    // storage order is Beatriz, Bruna, Vitor, Laura: the list sorts by requestedAt
    expect(list[0].requested.map((r) => r.id)).toEqual([
      "enr-bruna-lopes",
      "enr-vitor-nogueira",
      "enr-laura-bastos-carlos",
      "enr-beatriz-campos",
    ])
    expect(list[0].requested[0]).toMatchObject({
      studentName: "Bruna Lopes",
      studentPhone: "(11) 90000-0044",
      boardingPoint: { id: "bp-carlos-matriz", name: "Praça da Matriz" },
    })
  })

  it("confirmed enrollments are in neither list", async () => {
    const [item] = await listRequests("op-carlos")
    expect(item.accepted).toEqual([])
    const ids = [...item.requested, ...item.accepted].map((r) => r.id)
    expect(ids).not.toContain("enr-mateus-lima")
  })

  it("accepted enrollments wait in their own list, oldest first", async () => {
    const [item] = await listRequests("op-ana")
    expect(item.requested).toEqual([])
    expect(item.accepted.map((r) => r.id)).toEqual(["enr-laura-bastos-ana"])

    setStatus({ "enr-beatriz-campos": "accepted", "enr-bruna-lopes": "accepted" })
    const [carlos] = await listRequests("op-carlos")
    expect(carlos.accepted.map((r) => r.id)).toEqual(["enr-bruna-lopes", "enr-beatriz-campos"])
  })

  it("declined and cancelled enrollments are not listed", async () => {
    setStatus({ "enr-bruna-lopes": "declined", "enr-vitor-nogueira": "cancelled" })
    const [item] = await listRequests("op-carlos")
    expect(item.requested.map((r) => r.id)).toEqual(["enr-laura-bastos-carlos", "enr-beatriz-campos"])
    expect(item.accepted).toEqual([])
  })

  it("only the owner sees the requests of a route", async () => {
    const [ana] = await listRequests("op-ana")
    const ids = [...ana.requested, ...ana.accepted].map((r) => r.id)
    expect(ana.route.id).toBe("route-ana")
    expect(ids).not.toContain("enr-bruna-lopes")
    expect(await listRequests("op-nobody")).toEqual([])
  })

  it("a route created later shows up with empty lists", async () => {
    await createRoute("op-carlos", newRoute)
    const list = await listRequests("op-carlos")
    expect(list.map((i) => i.route.id)).toEqual(["route-carlos", "route-sorocaba"])
    expect(list[1].requested).toEqual([])
    expect(list[1].accepted).toEqual([])
  })
})

describe("acceptRequest", () => {
  it("accepts a requested enrollment: it takes a seat and leaves the pending count", async () => {
    const result = await acceptRequest("op-carlos", "enr-beatriz-campos")
    expect(result).toMatchObject({ ok: true, data: { id: "enr-beatriz-campos", status: "accepted" } })
    expect(statusOf("enr-beatriz-campos")).toBe("accepted")
    expect(await occupiedSeats("route-carlos")).toBe(13)
    expect(await countPendingRequests("op-carlos")).toBe(3)
    const [item] = await listRequests("op-carlos")
    expect(item.accepted.map((r) => r.id)).toEqual(["enr-beatriz-campos"])
  })

  it("another operator's request, or one that does not exist, is not found and nothing is written", async () => {
    const before = read("enrollments")
    expect(await acceptRequest("op-ana", "enr-beatriz-campos")).toEqual({ ok: false, error: "Pedido não encontrado." })
    expect(await acceptRequest("op-carlos", "enr-x")).toEqual({ ok: false, error: "Pedido não encontrado." })
    expect(read("enrollments")).toEqual(before)
  })

  it.each([
    ["enr-laura-bastos-ana", "op-ana"], // accepted
    ["enr-mateus-lima", "op-carlos"], // confirmed
  ])("%s is no longer waiting and nothing is written", async (id, operatorId) => {
    const before = read("enrollments")
    expect(await acceptRequest(operatorId, id)).toEqual({ ok: false, error: "Esse pedido não está mais esperando." })
    expect(read("enrollments")).toEqual(before)
  })

  it("a declined request cannot be accepted afterwards", async () => {
    await declineRequest("op-carlos", "enr-bruna-lopes")
    const result = await acceptRequest("op-carlos", "enr-bruna-lopes")
    expect(result).toEqual({ ok: false, error: "Esse pedido não está mais esperando." })
    expect(statusOf("enr-bruna-lopes")).toBe("declined")
  })

  it("a full van refuses the request and leaves it requested", async () => {
    for (const id of ["enr-bruna-lopes", "enr-vitor-nogueira", "enr-laura-bastos-carlos"]) {
      expect((await acceptRequest("op-carlos", id)).ok).toBe(true)
    }
    expect(await occupiedSeats("route-carlos")).toBe(15)

    const before = read("enrollments")
    const result = await acceptRequest("op-carlos", "enr-beatriz-campos")
    expect(result).toEqual({ ok: false, error: "A van está lotada. Recuse o pedido ou libere um lugar." })
    expect(read("enrollments")).toEqual(before)
    expect(statusOf("enr-beatriz-campos")).toBe("requested")

    expect((await declineRequest("op-carlos", "enr-beatriz-campos")).ok).toBe(true)
  })

  it("a student who already kept another van cannot be accepted, and nothing is written", async () => {
    setStatus({ "enr-laura-bastos-ana": "confirmed", "enr-laura-bastos-carlos": "cancelled" })
    const before = read("enrollments")
    const result = await acceptRequest("op-carlos", "enr-laura-bastos-carlos")
    expect(result).toEqual({ ok: false, error: "Esse aluno já ficou com outra van." })
    expect(read("enrollments")).toEqual(before)
  })
})

describe("declineRequest", () => {
  it("declines a requested enrollment without touching the seats", async () => {
    const result = await declineRequest("op-carlos", "enr-bruna-lopes")
    expect(result).toMatchObject({ ok: true, data: { id: "enr-bruna-lopes", status: "declined" } })
    expect(statusOf("enr-bruna-lopes")).toBe("declined")
    expect(await occupiedSeats("route-carlos")).toBe(12)
    expect(await countPendingRequests("op-carlos")).toBe(3)
  })

  it("another operator's request, or one that does not exist, is not found and nothing is written", async () => {
    const before = read("enrollments")
    expect(await declineRequest("op-ana", "enr-bruna-lopes")).toEqual({ ok: false, error: "Pedido não encontrado." })
    expect(await declineRequest("op-carlos", "enr-x")).toEqual({ ok: false, error: "Pedido não encontrado." })
    expect(read("enrollments")).toEqual(before)
  })

  it.each([
    ["enr-laura-bastos-ana", "op-ana"], // accepted
    ["enr-mateus-lima", "op-carlos"], // confirmed
  ])("%s is no longer waiting and nothing is written", async (id, operatorId) => {
    const before = read("enrollments")
    expect(await declineRequest(operatorId, id)).toEqual({ ok: false, error: "Esse pedido não está mais esperando." })
    expect(read("enrollments")).toEqual(before)
  })

  it("a student who already kept another van is told so, and nothing is written", async () => {
    setStatus({ "enr-laura-bastos-ana": "confirmed", "enr-laura-bastos-carlos": "cancelled" })
    const before = read("enrollments")
    const result = await declineRequest("op-carlos", "enr-laura-bastos-carlos")
    expect(result).toEqual({ ok: false, error: "Esse aluno já ficou com outra van." })
    expect(read("enrollments")).toEqual(before)
  })
})
