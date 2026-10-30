import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Result, SingleTripBooking } from "@/types"
import { toInstant } from "./clock"
import { clearAll, read, seed, write } from "./storage"
import { announceSeats, bookSingleTrip, cancelBooking, getMySingleTrips, listSingleTrips, payBooking } from "./single-trips"

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

// Friday 30/10, 01:00: Carlos's call is open (−24 h = 29/10 17:50), departure 17:50, reclaim until 11:50.
// Seeded story: going 9, sold 2 (Gustavo paid, Júlia Prado pending), leftover 4, onSale 3, offer-carlos seats 5.
const NOW = at("2026-10-30", "01:00")
const MATRIZ = "bp-carlos-matriz"

const snapshot = () => JSON.stringify([read("singleTripOffers"), read("singleTripBookings")])

/** The call is refused with `error` and nothing is written. */
async function refused(call: () => Promise<Result<unknown>>, error: string) {
  const before = snapshot()
  expect(await call()).toEqual({ ok: false, error })
  expect(snapshot()).toBe(before)
}

async function book(studentId: string, now = NOW, boardingPointId = MATRIZ, offerId = "offer-carlos"): Promise<SingleTripBooking> {
  const result = await bookSingleTrip(studentId, offerId, boardingPointId, now)
  if (!result.ok) throw new Error(`setup: ${result.error}`)
  return result.data
}

const offersOf = (routeId: string, date: string) => read("singleTripOffers").filter((o) => o.routeId === routeId && o.date === date)
const bookingOf = (id: string) => read("singleTripBookings").find((b) => b.id === id)

describe("announceSeats", () => {
  it("sets the offer to sold + quantity and puts those seats on sale", async () => {
    const result = await announceSeats("op-carlos", "route-carlos", 4, NOW)
    expect(result).toMatchObject({ ok: true, data: { id: "offer-carlos", routeId: "route-carlos", date: "2026-10-30", seats: 6 } })
    expect(read("singleTripOffers").find((o) => o.id === "offer-carlos")?.seats).toBe(6)
    const cards = await listSingleTrips("itu", NOW)
    expect(cards[0].available).toBe(4)
  })

  it("leaves the history offer of the same day untouched", async () => {
    const before = read("singleTripOffers").find((o) => o.id === "offer-carlos-w0-fri")
    await announceSeats("op-carlos", "route-carlos", 4, NOW)
    expect(read("singleTripOffers").find((o) => o.id === "offer-carlos-w0-fri")).toEqual(before)
  })

  it("announcing twice keeps one offer per route + date", async () => {
    await announceSeats("op-carlos", "route-carlos", 4, NOW)
    const offers = offersOf("route-carlos", "2026-10-30").length
    const again = await announceSeats("op-carlos", "route-carlos", 4, NOW)
    expect(again).toMatchObject({ ok: true, data: { seats: 6 } })
    expect(offersOf("route-carlos", "2026-10-30")).toHaveLength(offers)
  })

  it("creates the offer of the next outbound when the route has none", async () => {
    // Fri 31/10 08:00: the next outbound is Monday 02/11 and nothing is announced for it yet.
    const result = await announceSeats("op-carlos", "route-carlos", 2, at("2026-10-31", "08:00"))
    expect(result).toMatchObject({ ok: true, data: { routeId: "route-carlos", date: "2026-11-02", seats: 2 } })
    expect(offersOf("route-carlos", "2026-11-02")).toHaveLength(1)
  })

  it("refuses more than the sellable seats and names the limit", async () => {
    await refused(() => announceSeats("op-carlos", "route-carlos", 5, NOW), "Só dá para vender até 4 lugares.")
  })

  it.each([0, -1, 1.5, Number.NaN])("refuses quantity %s", async (quantity) => {
    await refused(() => announceSeats("op-carlos", "route-carlos", quantity, NOW), "Escolha pelo menos 1 lugar.")
  })

  it.each(["op-ana", "st-rafael-moura", "op-ninguem"])("refuses %s on route-carlos: not the operator's route", async (accountId) => {
    await refused(() => announceSeats(accountId, "route-carlos", 1, NOW), "Rota não encontrada.")
  })

  it("refuses a missing route", async () => {
    await refused(() => announceSeats("op-carlos", "route-x", 1, NOW), "Rota não encontrada.")
  })

  it("refuses when no seat is left on both legs", async () => {
    write("routes", read("routes").map((r) => (r.id === "route-carlos" ? { ...r, seats: 11 } : r))) // 11 − 9 going − 2 sold = 0
    await refused(() => announceSeats("op-carlos", "route-carlos", 1, NOW), "Não sobra lugar nos dois trechos.")
  })

  it("refuses a route without a valid outboundTime", async () => {
    write("routes", read("routes").map((r) => (r.id === "route-carlos" ? { ...r, outboundTime: "" } : r)))
    await refused(() => announceSeats("op-carlos", "route-carlos", 1, NOW), "Esta rota está sem horário de ida.")
  })
})

describe("listSingleTrips", () => {
  it("lists the routes of the city with seats on sale: price, seats and reclaim deadline", async () => {
    const cards = await listSingleTrips("itu", NOW) // Márcia's van is full: nothing on sale
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      offerId: "offer-carlos", date: "2026-10-30", price: 3000, available: 3, reclaimUntil: "2026-10-30T11:50",
    })
    expect(cards[0].van.id).toBe("route-carlos")
  })

  it("is empty for a city without vans", async () => {
    expect(await listSingleTrips("sorocaba", NOW)).toEqual([])
  })

  it("has nothing on sale once the outbound has left", async () => {
    // Carlos's next outbound is then Monday 02/11, with no offer.
    expect(await listSingleTrips("itu", at("2026-10-30", "17:50"))).toEqual([])
  })

  it("follows the bookings: available drops when someone books", async () => {
    await book("st-rafael-moura")
    expect((await listSingleTrips("itu", NOW))[0].available).toBe(2)
  })
})

describe("bookSingleTrip", () => {
  it("writes a pending booking with the price of the formula and no credit used", async () => {
    const result = await bookSingleTrip("st-rafael-moura", "offer-carlos", MATRIZ, NOW)
    expect(result).toMatchObject({
      ok: true,
      data: {
        offerId: "offer-carlos", studentId: "st-rafael-moura", boardingPointId: MATRIZ,
        price: 3000, vandiFee: 318, operatorShare: 2682, creditUsed: 0, status: "pending", createdAt: NOW,
      },
    })
    if (!result.ok) return
    expect(read("singleTripBookings")).toContainEqual(result.data)
  })

  it("prices by route: Ana's van costs less", async () => {
    // offer-ana-w0-fri is the history offer of 30/10 (no hand-written offer on Ana's van).
    const booking = await book("st-rafael-moura", NOW, "bp-ana-rodoviaria", "offer-ana-w0-fri")
    expect(booking).toMatchObject({ price: 2500, vandiFee: 261, operatorShare: 2239 })
  })

  it("prices by the month of the offer date (November has 21 business days)", async () => {
    const offer = await announceSeats("op-carlos", "route-carlos", 2, at("2026-10-31", "08:00"))
    if (!offer.ok) throw new Error(offer.error)
    const booking = await book("st-rafael-moura", at("2026-10-31", "08:00"), MATRIZ, offer.data.id)
    expect(booking).toMatchObject({ price: 3000, vandiFee: 298, operatorShare: 2702 })
  })

  it("books the same student once per day: the second tap is refused and writes nothing", async () => {
    await book("st-rafael-moura")
    const bookings = read("singleTripBookings").length
    await refused(() => bookSingleTrip("st-rafael-moura", "offer-carlos", MATRIZ, NOW), "Você já tem uma diária neste dia.")
    expect(read("singleTripBookings")).toHaveLength(bookings)
  })

  it("lets the student book again after cancelling", async () => {
    const first = await book("st-rafael-moura", at("2026-10-29", "19:00"))
    await cancelBooking("st-rafael-moura", first.id, at("2026-10-29", "19:10"))
    const result = await bookSingleTrip("st-rafael-moura", "offer-carlos", MATRIZ, at("2026-10-29", "19:20"))
    expect(result).toMatchObject({ ok: true, data: { status: "pending" } })
  })

  it("refuses an account that is not a student", async () => {
    await refused(() => bookSingleTrip("op-carlos", "offer-carlos", MATRIZ, NOW), "Só aluno pode reservar a diária.")
  })

  it("refuses a missing account", async () => {
    await refused(() => bookSingleTrip("st-ninguem", "offer-carlos", MATRIZ, NOW), "Só aluno pode reservar a diária.")
  })

  it("refuses a missing offer", async () => {
    await refused(() => bookSingleTrip("st-rafael-moura", "offer-x", MATRIZ, NOW), "Essa diária não está mais à venda.")
  })

  it("refuses from the departure on", async () => {
    await refused(
      () => bookSingleTrip("st-rafael-moura", "offer-carlos", MATRIZ, at("2026-10-30", "17:50")),
      "Essa diária não está mais à venda.",
    )
  })

  it("refuses a student with a fixed seat on the route", async () => {
    await refused(() => bookSingleTrip("st-mateus-lima", "offer-carlos", MATRIZ, NOW), "Você já tem vaga fixa nesta van.")
  })

  it.each(["bp-ana-igreja", "bp-x"])("refuses the boarding point %s: not of the route", async (pointId) => {
    await refused(() => bookSingleTrip("st-rafael-moura", "offer-carlos", pointId, NOW), "Escolha um ponto desta van.")
  })

  it("refuses when the seats on sale are gone", async () => {
    for (const id of ["st-rafael-moura", "st-beatriz-campos", "st-bruna-lopes"]) await book(id) // onSale 3 → 0
    await refused(() => bookSingleTrip("st-hugo-salles", "offer-carlos", MATRIZ, NOW), "Acabaram os lugares desta diária.")
  })
})

describe("payBooking", () => {
  it("turns the student's pending booking into paid", async () => {
    const result = await payBooking("st-julia-prado", "booking-julia")
    expect(result).toMatchObject({ ok: true, data: { id: "booking-julia", status: "paid" } })
    expect(bookingOf("booking-julia")?.status).toBe("paid")
  })

  it("paying twice is refused and changes nothing", async () => {
    await payBooking("st-julia-prado", "booking-julia")
    await refused(() => payBooking("st-julia-prado", "booking-julia"), "Essa reserva já está paga.")
    expect(read("singleTripBookings").filter((b) => b.id === "booking-julia")).toHaveLength(1)
  })

  it("refuses a cancelled booking", async () => {
    write("singleTripBookings", read("singleTripBookings").map((b) => (b.id === "booking-julia" ? { ...b, status: "cancelled" as const } : b)))
    await refused(() => payBooking("st-julia-prado", "booking-julia"), "Essa reserva foi cancelada.")
  })

  it.each(["st-rafael-moura", "op-carlos"])("refuses %s: not the owner of the booking", async (accountId) => {
    await refused(() => payBooking(accountId, "booking-julia"), "Reserva não encontrada.")
  })

  it("refuses a missing booking", async () => {
    await refused(() => payBooking("st-julia-prado", "booking-x"), "Reserva não encontrada.")
  })
})

describe("cancelBooking", () => {
  const EVE_BEFORE = at("2026-10-29", "19:00") // booking time; the limit is 20:00 of the eve

  it("cancels until 19:59 of the eve and gives the seat back", async () => {
    const booking = await book("st-rafael-moura", EVE_BEFORE)
    const result = await cancelBooking("st-rafael-moura", booking.id, at("2026-10-29", "19:59"))
    expect(result).toMatchObject({ ok: true, data: { id: booking.id, status: "cancelled" } })
    expect(bookingOf(booking.id)?.status).toBe("cancelled")
    expect((await listSingleTrips("itu", EVE_BEFORE))[0].available).toBe(3)
  })

  it("cancels a paid booking too", async () => {
    const booking = await book("st-rafael-moura", EVE_BEFORE)
    await payBooking("st-rafael-moura", booking.id)
    const result = await cancelBooking("st-rafael-moura", booking.id, at("2026-10-29", "19:59"))
    expect(result).toMatchObject({ ok: true, data: { status: "cancelled" } })
  })

  it("refuses from 20:00 of the eve and keeps the booking", async () => {
    const booking = await book("st-rafael-moura", EVE_BEFORE)
    await refused(
      () => cancelBooking("st-rafael-moura", booking.id, at("2026-10-29", "20:00")),
      "Depois das 20h da véspera não dá mais para cancelar.",
    )
    expect(bookingOf(booking.id)?.status).toBe("pending")
  })

  it("cancelling twice is refused and changes nothing", async () => {
    const booking = await book("st-rafael-moura", EVE_BEFORE)
    await cancelBooking("st-rafael-moura", booking.id, at("2026-10-29", "19:30"))
    await refused(() => cancelBooking("st-rafael-moura", booking.id, at("2026-10-29", "19:31")), "Essa reserva já foi cancelada.")
  })

  it.each(["st-julia-prado", "op-carlos"])("refuses %s: not the owner of the booking", async (accountId) => {
    const booking = await book("st-rafael-moura", EVE_BEFORE)
    await refused(() => cancelBooking(accountId, booking.id, at("2026-10-29", "19:30")), "Reserva não encontrada.")
  })

  it("refuses a missing booking", async () => {
    await refused(() => cancelBooking("st-rafael-moura", "booking-x", EVE_BEFORE), "Reserva não encontrada.")
  })
})

describe("getMySingleTrips", () => {
  it("shows the student's day pass with the van, the point and the deadlines", async () => {
    const trips = await getMySingleTrips("st-gustavo-reis", NOW)
    expect(trips).toHaveLength(1)
    expect(trips[0]).toMatchObject({
      date: "2026-10-30", operatorName: "Carlos Almeida", operatorPhone: "(11) 90000-0040",
      cancelUntil: "2026-10-29T20:00", reclaimUntil: "2026-10-30T11:50",
      canCancel: false, atRisk: true, // booked at 21:00 of the eve: past the cancel limit, the fixed student can still reclaim
    })
    expect(trips[0].booking.id).toBe("booking-gustavo")
    expect(trips[0].route.id).toBe("route-carlos")
    expect(trips[0].boardingPoint.id).toBe(MATRIZ)
  })

  it("is no longer at risk after the reclaim deadline", async () => {
    const [trip] = await getMySingleTrips("st-gustavo-reis", at("2026-10-30", "12:00"))
    expect(trip).toMatchObject({ atRisk: false, canCancel: false })
  })

  it("is empty once the departure has passed", async () => {
    expect(await getMySingleTrips("st-gustavo-reis", at("2026-10-30", "18:00"))).toEqual([])
  })

  it("is empty for a student without a day pass", async () => {
    expect(await getMySingleTrips("st-rafael-moura", NOW)).toEqual([])
  })

  it("can be cancelled before 20:00 of the eve, not from 20:00", async () => {
    const booking = await book("st-rafael-moura", at("2026-10-29", "19:00"))
    const [before] = await getMySingleTrips("st-rafael-moura", at("2026-10-29", "19:59"))
    const [after] = await getMySingleTrips("st-rafael-moura", at("2026-10-29", "20:00"))
    expect(before).toMatchObject({ canCancel: true, atRisk: true })
    expect(before.booking.id).toBe(booking.id)
    expect(after.canCancel).toBe(false)
  })

  it("keeps a cancelled booking in the list, neither cancellable nor at risk", async () => {
    const booking = await book("st-rafael-moura", at("2026-10-29", "19:00"))
    await cancelBooking("st-rafael-moura", booking.id, at("2026-10-29", "19:10"))
    const [trip] = await getMySingleTrips("st-rafael-moura", at("2026-10-29", "19:20"))
    expect(trip.booking.status).toBe("cancelled")
    expect(trip).toMatchObject({ canCancel: false, atRisk: false })
  })

  it("lists the newest booking first", async () => {
    const first = await book("st-rafael-moura", at("2026-10-29", "19:00"))
    await cancelBooking("st-rafael-moura", first.id, at("2026-10-29", "19:10"))
    const second = await book("st-rafael-moura", at("2026-10-29", "19:20"))
    const trips = await getMySingleTrips("st-rafael-moura", at("2026-10-29", "19:30"))
    expect(trips.map((t) => t.booking.id)).toEqual([second.id, first.id])
  })
})
