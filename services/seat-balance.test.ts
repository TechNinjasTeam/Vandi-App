import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { OutboundCallResponse } from "@/types"
import { toInstant } from "./clock"
import { callDeadlines, callPhase, getSeatBalance, occupiesLeg } from "./seat-balance"
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

const response = (studentId: string, outbound: boolean, ret: boolean): OutboundCallResponse => ({
  id: `ocr-${studentId}`, studentId, routeId: "route-carlos", date: "2026-10-30", outbound, return: ret,
  answeredAt: at("2026-10-30", "01:00"),
})
const respond = (...rows: OutboundCallResponse[]) =>
  write("outboundCallResponses", [...read("outboundCallResponses"), ...rows])

describe("callDeadlines", () => {
  it("measures −24, −12 and −6 h from the departure, in local time", () => {
    expect(callDeadlines("2026-10-30", "17:50")).toEqual({
      departure: "2026-10-30T17:50", opensAt: "2026-10-29T17:50", answerBy: "2026-10-30T05:50", reclaimUntil: "2026-10-30T11:50",
    })
  })
})

describe("callPhase", () => {
  it.each([
    ["2026-10-29", "17:49", "not_open"],
    ["2026-10-29", "17:50", "open"],
    ["2026-10-30", "05:49", "open"],
    ["2026-10-30", "05:50", "after_deadline"],
    ["2026-10-30", "11:49", "after_deadline"],
    ["2026-10-30", "11:50", "after_reclaim"],
  ])("%s %s is %s", (date, time, phase) => {
    expect(callPhase("2026-10-30", "17:50", at(date, time))).toBe(phase)
  })

  it("is not_open when the route has no valid outboundTime", () => {
    expect(callPhase("2026-10-30", "", at("2026-10-30", "10:00"))).toBe("not_open")
  })
})

describe("occupiesLeg", () => {
  it("follows the answer when there is one", () => {
    expect(occupiesLeg(response("s", true, false), "outbound", "after_deadline")).toBe(true)
    expect(occupiesLeg(response("s", true, false), "return", "open")).toBe(false)
  })

  it("keeps the seat of Sem resposta until −12 h", () => {
    expect(occupiesLeg(undefined, "outbound", "open")).toBe(true)
    expect(occupiesLeg(undefined, "outbound", "after_deadline")).toBe(false)
  })
})

describe("getSeatBalance", () => {
  const balance = (time: string, date = "2026-10-30") => getSeatBalance("route-carlos", date, at("2026-10-30", time))

  // seed("2026-10-30") is a Friday: the history also has offer-carlos-w0-fri on that date, which must not count.
  it("counts the seeded story before −12 h", async () => {
    const b = await balance("01:00")
    expect(b.seats).toBe(15)
    expect(b.outbound).toEqual({ going: 9, sold: 2, leftover: 4 })
    expect(b.return).toEqual({ going: 9, sold: 2, leftover: 4 })
    expect(b.sellable).toBe(4)
    expect(b.offer?.id).toBe("offer-carlos")
    expect(b.onSale).toBe(3)
  })

  it("stops counting Sem resposta from −12 h", async () => {
    const b = await balance("06:00")
    expect(b.outbound).toEqual({ going: 6, sold: 2, leftover: 7 })
    expect(b.return).toEqual({ going: 6, sold: 2, leftover: 7 })
    expect(b.sellable).toBe(7)
    expect(b.onSale).toBe(3)
  })

  it("shrinks the announcement when students take the seat back", async () => {
    write("outboundCallResponses", read("outboundCallResponses").map((r) =>
      ["st-lia-ferraz", "st-tiago-reis"].includes(r.studentId) ? { ...r, outbound: true, return: true } : r))
    const b = await balance("01:00")
    expect(b.outbound.leftover).toBe(2)
    expect(b.onSale).toBe(2)
  })

  it("never sells with a free seat on one leg only", async () => {
    write("outboundCallResponses", read("outboundCallResponses").map((r) =>
      r.studentId === "st-davi-rocha" ? { ...r, return: false } : r))
    const b = await balance("01:00")
    expect(b.outbound.leftover).toBe(4)
    expect(b.return.leftover).toBe(5)
    expect(b.sellable).toBe(4)
  })

  it("counts accepted enrollments on both legs at any hour, with or without a response", async () => {
    write("enrollments", read("enrollments").map((e) =>
      ["enr-beatriz-campos", "enr-bruna-lopes"].includes(e.id) ? { ...e, status: "accepted" as const } : e))
    respond(response("st-bruna-lopes", false, false))
    const early = await balance("01:00")
    const late = await balance("06:00")
    for (const leg of ["outbound", "return"] as const) {
      expect(early[leg].going).toBe(9 + 2)
      expect(late[leg].going).toBe(6 + 2)
    }
  })

  it("does not count a cancelled booking as sold", async () => {
    write("singleTripBookings", read("singleTripBookings").map((b) =>
      b.id === "booking-julia" ? { ...b, status: "cancelled" as const } : b))
    const b = await balance("01:00")
    expect(b.outbound.sold).toBe(1)
    expect(b.outbound.leftover).toBe(5)
  })

  it("has nothing to sell on another date", async () => {
    const b = await balance("01:00", "2026-11-02")
    expect(b.outbound.sold).toBe(0)
    expect(b.offer).toBeNull()
    expect(b.onSale).toBe(0)
  })

  it("is empty for a missing route", async () => {
    const b = await getSeatBalance("route-x", "2026-10-30", at("2026-10-30", "01:00"))
    expect(b.seats).toBe(0)
    expect(b.sellable).toBe(0)
    expect(b.onSale).toBe(0)
  })
})
