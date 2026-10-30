import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { OutboundCallAnswer, SingleTripBooking } from "@/types"
import { toInstant } from "./clock"
import { answerOutboundCall, getCredit, getOutboundCall, reclaimSeat } from "./outbound-call"
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

// Frozen clock: `now` is always a parameter, the system clock only guards against accidental reads.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(toInstant("2026-10-30", "01:00")))
  vi.stubGlobal("localStorage", makeFake())
  clearAll()
  seed("2026-10-30")
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

// Never a hand-written offset: the runner may be in any timezone.
const at = (date: string, time: string) => new Date(toInstant(date, time)).toISOString()
// seed("2026-10-30") is a Friday: Carlos's next outbound is 30/10 17:50 (opens 29/10 17:50, −12 h 05:50, −6 h 11:50).
const fri = (time: string) => at("2026-10-30", time)
const thu = (time: string) => at("2026-10-29", time)

const NOT_OPEN = "A chamada ainda não abriu."
const NO_SEAT = "Você não tem vaga fixa nesta van."
const ONLY_RELEASE = "Agora só dá para liberar o lugar."
const RECLAIM_CLOSED = "Prazo para recorrer encerrado."

const responses = () => read("outboundCallResponses")
const rowOf = (studentId: string) => responses().find((r) => r.studentId === studentId)
const snapshot = () => JSON.stringify({ r: responses(), b: read("singleTripBookings") })
const statusOf = (id: string) => read("singleTripBookings").find((b) => b.id === id)?.status

// The seeded createdAt carry -03:00 (DEC-038): build the extra ones from the seed, n × 10 min newer than booking-julia.
const booking = (id: string, n: number): SingleTripBooking => ({
  id, offerId: "offer-carlos", studentId: `st-apoio-${id}`, boardingPointId: "bp-carlos-matriz",
  price: 3000, vandiFee: 318, operatorShare: 2682, creditUsed: 0, status: "pending",
  createdAt: new Date(Date.parse(read("singleTripBookings").find((b) => b.id === "booking-julia")!.createdAt) + n * 600_000).toISOString(),
})
const addBookings = (...rows: SingleTripBooking[]) => write("singleTripBookings", [...read("singleTripBookings"), ...rows])
const setBookingStatus = (id: string, status: SingleTripBooking["status"]) =>
  write("singleTripBookings", read("singleTripBookings").map((b) => (b.id === id ? { ...b, status } : b)))

describe("getOutboundCall", () => {
  it("shows the next outbound call of a vaga fixa student with the deadlines", async () => {
    const call = await getOutboundCall("st-mateus-lima", fri("01:00"))
    expect(call).toMatchObject({
      routeId: "route-carlos", date: "2026-10-30", phase: "open", response: null,
      departure: "2026-10-30T17:50", opensAt: "2026-10-29T17:50", answerBy: "2026-10-30T05:50", reclaimUntil: "2026-10-30T11:50",
    })
  })

  it("carries the answer already given", async () => {
    const call = await getOutboundCall("st-lia-ferraz", fri("01:00"))
    expect(call?.response).toMatchObject({ studentId: "st-lia-ferraz", outbound: false, return: false })
  })

  it("has no call without a confirmed enrollment", async () => {
    expect(await getOutboundCall("st-rafael-moura", fri("01:00"))).toBeNull() // no enrollment
    expect(await getOutboundCall("st-beatriz-campos", fri("01:00"))).toBeNull() // requested only
  })

  it("has no call for a student who only holds a day pass", async () => {
    expect(await getOutboundCall("st-gustavo-reis", fri("01:00"))).toBeNull()
  })

  it("has no call when the route has no valid outboundTime", async () => {
    write("routes", read("routes").map((r) => (r.id === "route-carlos" ? { ...r, outboundTime: "" } : r)))
    expect(await getOutboundCall("st-mateus-lima", fri("01:00"))).toBeNull()
  })

  it("targets the next outbound after the departure, and it is not open yet", async () => {
    const call = await getOutboundCall("st-mateus-lima", fri("17:51"))
    expect(call).toMatchObject({ date: "2026-11-02", phase: "not_open", response: null })
  })

  // Carlos runs Mon-Fri, so his Friday departure has been open since Thursday 17:50.
  it.each([
    [thu("17:50"), "open"],
    [fri("05:49"), "open"],
    [fri("05:50"), "after_deadline"],
    [fri("11:49"), "after_deadline"],
    [fri("11:50"), "after_reclaim"],
  ])("phase at %s is %s", async (now, phase) => {
    expect((await getOutboundCall("st-mateus-lima", now))?.phase).toBe(phase)
  })

  // Ana runs Mon/Wed/Fri at 18:00: Friday's call opens Thursday 18:00 (-24 h).
  it.each([
    [thu("17:59"), "not_open"],
    [thu("18:00"), "open"],
  ])("Ana's phase at %s is %s", async (now, phase) => {
    expect(await getOutboundCall("st-ana-silva", now)).toMatchObject({ routeId: "route-ana", date: "2026-10-30", phase })
  })
})

describe("answerOutboundCall", () => {
  it.each<[OutboundCallAnswer, boolean, boolean]>([
    ["both", true, true],
    ["outbound_only", true, false],
    ["return_only", false, true],
    ["none", false, false],
  ])("answer %s writes { outbound: %s, return: %s } stamped with now", async (answer, outbound, ret) => {
    const now = fri("01:00")
    const result = await answerOutboundCall("st-mateus-lima", "route-carlos", answer, now)
    expect(result).toMatchObject({
      ok: true,
      data: { studentId: "st-mateus-lima", routeId: "route-carlos", date: "2026-10-30", outbound, return: ret, answeredAt: now },
    })
    expect(rowOf("st-mateus-lima")).toMatchObject({ outbound, return: ret, answeredAt: now })
  })

  it("replaces the row when answering again: one row per student, route and date", async () => {
    await answerOutboundCall("st-mateus-lima", "route-carlos", "both", fri("01:00"))
    await answerOutboundCall("st-mateus-lima", "route-carlos", "none", fri("02:00"))
    await answerOutboundCall("st-lia-ferraz", "route-carlos", "outbound_only", fri("02:00"))
    const mateus = responses().filter((r) => r.studentId === "st-mateus-lima")
    expect(mateus).toHaveLength(1)
    expect(mateus[0]).toMatchObject({ outbound: false, return: false, answeredAt: fri("02:00") })
    const lia = responses().filter((r) => r.studentId === "st-lia-ferraz")
    expect(lia).toHaveLength(1)
    expect(lia[0]).toMatchObject({ outbound: true, return: false, answeredAt: fri("02:00") })
    expect(responses()).toHaveLength(9 + 1)
  })

  it.each([
    ["a student without enrollment", "st-rafael-moura", "route-carlos"],
    ["a student of another route", "st-mateus-lima", "route-ana"],
    ["a requested enrollment", "st-beatriz-campos", "route-carlos"],
    ["an operator", "op-carlos", "route-carlos"],
  ])("refuses %s and writes nothing", async (_label, studentId, routeId) => {
    const before = snapshot()
    expect(await answerOutboundCall(studentId, routeId, "both", fri("01:00"))).toEqual({ ok: false, error: NO_SEAT })
    expect(snapshot()).toBe(before)
  })

  it("refuses a route without a valid outboundTime and writes nothing", async () => {
    write("routes", read("routes").map((r) => (r.id === "route-carlos" ? { ...r, outboundTime: "" } : r)))
    const before = snapshot()
    expect(await answerOutboundCall("st-mateus-lima", "route-carlos", "both", fri("01:00"))).toEqual({
      ok: false, error: "Esta rota está sem horário de ida.",
    })
    expect(snapshot()).toBe(before)
  })

  it("refuses to answer before the call opens (Ana's Friday 18:00 is not open on Thursday morning)", async () => {
    const before = snapshot()
    expect(await answerOutboundCall("st-ana-silva", "route-ana", "both", thu("10:00"))).toEqual({ ok: false, error: NOT_OPEN })
    expect(snapshot()).toBe(before)
  })

  it("refuses to answer after the departure: the call already targets the next trip, which is not open", async () => {
    const before = snapshot()
    expect(await answerOutboundCall("st-mateus-lima", "route-carlos", "both", fri("17:51"))).toEqual({ ok: false, error: NOT_OPEN })
    expect(snapshot()).toBe(before)
  })

  it("opens exactly 24 h before the departure (Ana: Friday 18:00 opens Thursday 18:00)", async () => {
    const before = snapshot()
    expect(await answerOutboundCall("st-ana-silva", "route-ana", "both", thu("17:59"))).toEqual({ ok: false, error: NOT_OPEN })
    expect(snapshot()).toBe(before)
    expect(await answerOutboundCall("st-ana-silva", "route-ana", "both", thu("18:00"))).toMatchObject({ ok: true })
  })

  it("lets Sem resposta take the seat both before and after −12 h: after it is a reclaim, allowed until −6 h", async () => {
    expect(await answerOutboundCall("st-mateus-lima", "route-carlos", "both", fri("05:49"))).toMatchObject({ ok: true })
    // Marcos is also Sem resposta: from 05:50 (−12 h) he is out of the list, but taking the seat back is still allowed.
    const result = await answerOutboundCall("st-marcos-lima", "route-carlos", "both", fri("05:50"))
    expect(result).toMatchObject({ ok: true, data: { outbound: true, return: true, answeredAt: fri("05:50") } })
    expect(rowOf("st-marcos-lima")).toMatchObject({ outbound: true, return: true, answeredAt: fri("05:50") })
  })

  it("decides by now at the tap: an answer that takes a leg after −6 h is refused, with nothing written", async () => {
    const before = snapshot()
    expect(await answerOutboundCall("st-mateus-lima", "route-carlos", "both", fri("11:51"))).toEqual({ ok: false, error: ONLY_RELEASE })
    expect(await answerOutboundCall("st-mateus-lima", "route-carlos", "outbound_only", fri("11:51"))).toEqual({ ok: false, error: ONLY_RELEASE })
    expect(snapshot()).toBe(before)
  })

  it("still lets a student release the seat after −6 h", async () => {
    const result = await answerOutboundCall("st-davi-rocha", "route-carlos", "none", fri("11:51"))
    expect(result).toMatchObject({ ok: true, data: { outbound: false, return: false, answeredAt: fri("11:51") } })
    expect(rowOf("st-davi-rocha")).toMatchObject({ outbound: false, return: false })
  })

  it("after −6 h refuses only the answers that take a leg the student does not take now", async () => {
    // Igor goes outbound only: keeping that is fine, taking the return is not.
    expect(await answerOutboundCall("st-igor-matos", "route-carlos", "both", fri("11:51"))).toEqual({ ok: false, error: ONLY_RELEASE })
    expect(await answerOutboundCall("st-igor-matos", "route-carlos", "outbound_only", fri("11:51"))).toMatchObject({ ok: true })
  })

  it("closes the taking-back exactly at −6 h", async () => {
    expect(await answerOutboundCall("st-mateus-lima", "route-carlos", "both", fri("11:49"))).toMatchObject({ ok: true })
    const before = snapshot()
    expect(await answerOutboundCall("st-marcos-lima", "route-carlos", "both", fri("11:50"))).toEqual({ ok: false, error: ONLY_RELEASE })
    expect(snapshot()).toBe(before)
  })

  it("re-taking a seat that was sold cancels only the most recent booking, until it fits", async () => {
    // 01:00: leftover 4 per leg. Four more bookings fill the van.
    addBookings(
      booking("fit-1", 1), booking("fit-2", 2), booking("fit-3", 3), booking("fit-4", 4),
    )
    const full = await getSeatBalance("route-carlos", "2026-10-30", fri("01:00"))
    expect(full.outbound.leftover).toBe(0)

    // Lia freed both legs; taking them back makes it -1 on each leg.
    const result = await answerOutboundCall("st-lia-ferraz", "route-carlos", "both", fri("01:00"))
    expect(result).toMatchObject({ ok: true })
    expect(statusOf("fit-4")).toBe("cancelled")
    for (const id of ["fit-1", "fit-2", "fit-3", "booking-gustavo", "booking-julia"]) expect(statusOf(id)).not.toBe("cancelled")
    expect(statusOf("booking-gustavo")).toBe("paid")
    const after = await getSeatBalance("route-carlos", "2026-10-30", fri("01:00"))
    expect(after.outbound.leftover).toBe(0)
    expect(after.return.leftover).toBe(0)
  })

  it("cancels nothing when the re-taken seat still fits", async () => {
    const before = JSON.stringify(read("singleTripBookings"))
    await answerOutboundCall("st-lia-ferraz", "route-carlos", "both", fri("01:00"))
    expect(JSON.stringify(read("singleTripBookings"))).toBe(before)
  })
})

describe("reclaimSeat", () => {
  it("writes Ida e volta for a student who did not answer, until −6 h", async () => {
    const result = await reclaimSeat("st-mateus-lima", "route-carlos", fri("11:49"))
    expect(result).toEqual({ ok: true, data: { cancelledBookings: 0 } })
    expect(rowOf("st-mateus-lima")).toMatchObject({
      routeId: "route-carlos", date: "2026-10-30", outbound: true, return: true, answeredAt: fri("11:49"),
    })
  })

  it("refuses from −6 h and writes nothing", async () => {
    const before = snapshot()
    expect(await reclaimSeat("st-mateus-lima", "route-carlos", fri("11:50"))).toEqual({ ok: false, error: RECLAIM_CLOSED })
    expect(snapshot()).toBe(before)
  })

  it("refuses a student without a vaga fixa on the route", async () => {
    const before = snapshot()
    expect(await reclaimSeat("st-rafael-moura", "route-carlos", fri("11:00"))).toEqual({ ok: false, error: NO_SEAT })
    expect(await reclaimSeat("op-carlos", "route-carlos", fri("11:00"))).toEqual({ ok: false, error: NO_SEAT })
    expect(snapshot()).toBe(before)
  })

  it("refuses before the call opens (Ana: Friday 18:00 opens Thursday 18:00) and accepts from the opening", async () => {
    const before = snapshot()
    expect(await reclaimSeat("st-ana-silva", "route-ana", thu("17:59"))).toEqual({ ok: false, error: NOT_OPEN })
    expect(snapshot()).toBe(before)
    expect(await reclaimSeat("st-ana-silva", "route-ana", thu("18:00"))).toMatchObject({ ok: true })
  })

  it("cancels only the bookings it takes to fit, most recent first", async () => {
    // 11:00 (after −12 h): going 6, sold 2. Seven more bookings leave leftover 0; Mateus taking back his seat makes it -1.
    const times = ["06:40", "06:50", "07:00", "07:10", "07:20", "07:30", "07:40"]
    addBookings(...times.map((t, i) => booking(`rc-${t.replace(":", "")}`, i + 1)))
    const full = await getSeatBalance("route-carlos", "2026-10-30", fri("11:00"))
    expect(full.outbound.leftover).toBe(0)
    expect(full.return.leftover).toBe(0)

    const result = await reclaimSeat("st-mateus-lima", "route-carlos", fri("11:00"))
    expect(result).toEqual({ ok: true, data: { cancelledBookings: 1 } })
    expect(statusOf("rc-0740")).toBe("cancelled")
    for (const t of times.slice(0, -1)) expect(statusOf(`rc-${t.replace(":", "")}`)).toBe("pending")
    expect(statusOf("booking-gustavo")).toBe("paid")
    expect(statusOf("booking-julia")).toBe("pending")
  })

  it("costs one booking per reclaim on a full van", async () => {
    // Two students reclaim in a row on a full van: each one costs one booking.
    addBookings(...["06:40", "06:50", "07:00", "07:10", "07:20", "07:30", "07:40"].map((t, i) => booking(`rc-${t}`, i + 1)))
    await reclaimSeat("st-mateus-lima", "route-carlos", fri("11:00"))
    const result = await reclaimSeat("st-marcos-lima", "route-carlos", fri("11:10"))
    expect(result).toEqual({ ok: true, data: { cancelledBookings: 1 } })
    expect(statusOf("rc-07:40")).toBe("cancelled")
    expect(statusOf("rc-07:30")).toBe("cancelled")
    expect(statusOf("rc-07:20")).toBe("pending")
  })
})

describe("getCredit", () => {
  // The seeded answeredAt carry -03:00: re-stamp them in local time (same order) so they fall before −12 h in any timezone.
  beforeEach(() => {
    const rank = [...responses()].sort((a, b) => Date.parse(a.answeredAt) - Date.parse(b.answeredAt)).map((r) => r.id)
    const base = Date.parse(thu("18:00"))
    write("outboundCallResponses", responses().map((r) => ({ ...r, answeredAt: new Date(base + (rank.indexOf(r.id) + 1) * 300_000).toISOString() })))
  })

  it("gives Lia the credit of both legs matched to the paid day pass, and Tiago nothing while his is only pending", async () => {
    expect(await getCredit("st-lia-ferraz")).toBe(864)
    expect(await getCredit("st-tiago-reis")).toBe(0)
  })

  it("gives nothing to who did not release a leg", async () => {
    expect(await getCredit("st-davi-rocha")).toBe(0) // Ida e volta
    expect(await getCredit("st-mateus-lima")).toBe(0) // Sem resposta
    expect(await getCredit("st-rafael-moura")).toBe(0) // no enrollment
  })

  it("follows the order of the notices: the second paid booking goes to the second release", async () => {
    setBookingStatus("booking-julia", "paid")
    expect(await getCredit("st-lia-ferraz")).toBe(864)
    expect(await getCredit("st-tiago-reis")).toBe(864)
  })

  it("takes the credit away when the student reclaims the seat, and moves it down the line", async () => {
    setBookingStatus("booking-julia", "paid")
    await reclaimSeat("st-lia-ferraz", "route-carlos", fri("06:00"))
    expect(await getCredit("st-lia-ferraz")).toBe(0)
    expect(await getCredit("st-tiago-reis")).toBe(864) // gustavo now matches Tiago on both legs
    expect(await getCredit("st-julia-neves")).toBe(432) // júlia's outbound leg
    expect(await getCredit("st-igor-matos")).toBe(432) // júlia's return leg
  })

  it.each(["pending", "cancelled"] as const)("a %s day pass earns no credit", async (status) => {
    setBookingStatus("booking-gustavo", status)
    expect(await getCredit("st-lia-ferraz")).toBe(0)
  })

  it("pays only the legs released before −12 h", async () => {
    // Everybody keeps the seat but Lia, so Lia is first in line for the paid booking.
    const stamp = (answeredAt: string) =>
      write("outboundCallResponses", responses().map((r) =>
        r.studentId === "st-lia-ferraz" ? { ...r, answeredAt } : { ...r, outbound: true, return: true }))
    stamp(fri("05:49"))
    expect(await getCredit("st-lia-ferraz")).toBe(864)
    stamp(fri("05:50"))
    expect(await getCredit("st-lia-ferraz")).toBe(0)
  })
})
