import { describe, expect, it } from "vitest"
import type {
  Absence, Enrollment, MetricsInput, Route, SingleTripBooking, SingleTripOffer, Trip, Weekday, WeekMetrics,
} from "@/types"
import {
  absencesByWeekday, buildDashboard, compareWeeks, computeWeek, weekRange, weeklySeries,
} from "./metrics"

// Pure functions, no storage and no clock: every fixture lives here. Today = Tue 2026-10-27.
const TODAY = "2026-10-27"

function route(id: string, origin: string, seats: number, weekdays: Weekday[]): Route {
  return {
    id, operatorId: "op-test", origin, destination: "Facens", weekdays,
    outboundTime: "17:50", returnTime: "22:50", seats, monthlyPrice: 38000,
  }
}
function enrollment(routeId: string, studentId: string, status: Enrollment["status"]): Enrollment {
  return { id: `enr-${routeId}-${studentId}`, routeId, studentId, boardingPointId: "bp-x", status, requestedAt: "2026-09-01T10:00" }
}
function trip(routeId: string, date: string, direction: Trip["direction"] = "outbound"): Trip {
  return { id: `trip-${routeId}-${date}-${direction}`, routeId, date, direction }
}
function absence(routeId: string, studentId: string, date: string, id = `abs-${routeId}-${studentId}-${date}`): Absence {
  return { id, studentId, routeId, date, reportedAt: `${date}T12:00` }
}
function offer(id: string, routeId: string, date: string): SingleTripOffer {
  return { id, routeId, date, seats: 5, createdAt: `${date}T09:00` }
}
function booking(
  id: string, offerId: string, status: SingleTripBooking["status"], operatorShare: number, absenceId: string | null,
): SingleTripBooking {
  return {
    id, offerId, studentId: "st-buyer", boardingPointId: "bp-x", absenceId,
    price: 3000, vandiFee: 300, operatorShare, creditAmount: 0, creditUsed: 0, status, createdAt: "2026-10-20T10:00",
  }
}
function week(overrides: Partial<WeekMetrics> = {}): WeekMetrics {
  return {
    start: "2026-10-26", end: "2026-10-31", tripCount: 1, seats: 10, fixed: 5, sold: 2, occupied: 7,
    rate: 0.7, leftover: 5, empty: 3, earnings: 1000, ...overrides,
  }
}

// Hand-made fixture (see the plan, S2).
const rA = route("rA", "Itu", 4, ["mon", "tue", "wed", "thu", "fri"])
const rB = route("rB", "Salto", 3, ["mon", "wed", "fri"])
const rC = route("rC", "Sorocaba", 15, ["mon", "tue", "wed", "thu", "fri"])

const input: MetricsInput = {
  routes: [rA, rB, rC],
  enrollments: [
    enrollment("rA", "s1", "confirmed"), enrollment("rA", "s2", "confirmed"), enrollment("rA", "s3", "confirmed"),
    enrollment("rA", "s9", "requested"),
    enrollment("rB", "s4", "confirmed"), enrollment("rB", "s5", "confirmed"), enrollment("rB", "s6", "declined"),
  ],
  trips: [
    // previous week: rA Mon-Fri, rB Mon/Wed/Fri
    trip("rA", "2026-10-19"), trip("rA", "2026-10-20"), trip("rA", "2026-10-21"), trip("rA", "2026-10-22"), trip("rA", "2026-10-23"),
    trip("rB", "2026-10-19"), trip("rB", "2026-10-21"), trip("rB", "2026-10-23"),
    // current week: 10-28 is in the future
    trip("rA", "2026-10-26"), trip("rA", "2026-10-27"), trip("rA", "2026-10-28"), trip("rB", "2026-10-26"),
    trip("rA", "2026-10-26", "return"),
  ],
  absences: [
    absence("rA", "s3", "2026-10-20"),
    absence("rA", "s1", "2026-10-23"), absence("rA", "s2", "2026-10-23"),
    absence("rB", "s4", "2026-10-23"),
    absence("rA", "s1", "2026-10-26"),
    absence("rA", "s1", "2026-10-27"), absence("rA", "s2", "2026-10-27"),
    absence("rB", "s6", "2026-10-26"), // declined student: ignored
    absence("rA", "s3", "2026-10-28"), // future: ignored
  ],
  singleTripOffers: [
    offer("oA23", "rA", "2026-10-23"), offer("oB23", "rB", "2026-10-23"),
    offer("oA26", "rA", "2026-10-26"), offer("oA27", "rA", "2026-10-27"),
  ],
  singleTripBookings: [
    booking("b5", "oA23", "paid", 1818, "abs-rA-s1-2026-10-23"),
    booking("b6", "oA23", "paid", 1818, "abs-rA-s2-2026-10-23"),
    booking("b7", "oB23", "paid", 1000, "abs-rB-s4-2026-10-23"),
    booking("b1", "oA26", "paid", 1818, "abs-rA-s1-2026-10-26"),
    booking("b2", "oA26", "cancelled", 1818, null),
    booking("b3", "oA27", "paid", 2682, null),
    booking("b4", "oA27", "pending", 2682, null),
  ],
}

const CURRENT_END = "2026-10-27"
const PREV_END = "2026-10-24"

describe("weekRange", () => {
  it.each(["2026-10-26", "2026-10-27", "2026-10-31", "2026-11-01"])(
    "gives Monday to Saturday of the week of %s (Sunday belongs to the week that just ended)",
    (date) => {
      expect(weekRange(date)).toEqual({ start: "2026-10-26", end: "2026-10-31" })
    },
  )
})

describe("computeWeek", () => {
  it("sums the current week up to today, weighted across routes (7/11, not the mean of 5/8 and 2/3)", () => {
    expect(computeWeek(input, "all", "2026-10-26", CURRENT_END)).toEqual({
      start: "2026-10-26", end: CURRENT_END, tripCount: 3, seats: 11, fixed: 5, sold: 2, occupied: 7,
      rate: 7 / 11, leftover: 6, empty: 4, earnings: 4500,
    })
  })

  it("sums the previous full week (20/29), ignoring unpaid bookings and return trips", () => {
    expect(computeWeek(input, "all", "2026-10-19", PREV_END)).toEqual({
      start: "2026-10-19", end: PREV_END, tripCount: 8, seats: 29, fixed: 17, sold: 3, occupied: 20,
      rate: 20 / 29, leftover: 12, empty: 9, earnings: 4636,
    })
  })

  it("filters one route: rA", () => {
    expect(computeWeek(input, "rA", "2026-10-26", CURRENT_END)).toMatchObject({
      tripCount: 2, seats: 8, fixed: 3, sold: 2, occupied: 5, rate: 0.625, leftover: 5, empty: 3, earnings: 4500,
    })
    expect(computeWeek(input, "rA", "2026-10-19", PREV_END)).toMatchObject({
      tripCount: 5, seats: 20, fixed: 12, sold: 2, occupied: 14, rate: 0.7, leftover: 8, empty: 6, earnings: 3636,
    })
  })

  it("filters one route: rB, ignoring the absence of a declined student", () => {
    expect(computeWeek(input, "rB", "2026-10-26", CURRENT_END)).toMatchObject({
      tripCount: 1, seats: 3, fixed: 2, sold: 0, occupied: 2, leftover: 1, empty: 1, earnings: 0,
    })
    expect(computeWeek(input, "rB", "2026-10-19", PREV_END)).toMatchObject({
      tripCount: 3, seats: 9, fixed: 5, sold: 1, occupied: 6, leftover: 4, empty: 3, earnings: 1000,
    })
  })

  it("counts only outbound trips: the return trip of 10-26 adds no seats", () => {
    expect(computeWeek(input, "rA", "2026-10-26", "2026-10-26")).toMatchObject({ tripCount: 1, seats: 4 })
  })

  it("does not count the trip, absence or booking after today", () => {
    expect(computeWeek(input, "rA", "2026-10-26", CURRENT_END).tripCount).toBe(2)
    expect(computeWeek(input, "rA", "2026-10-26", "2026-10-28").tripCount).toBe(3)
  })

  it("gives rate null and zeros for a route without trips or an unknown route, never NaN", () => {
    for (const filter of ["rC", "route-x"]) {
      expect(computeWeek(input, filter, "2026-10-26", CURRENT_END)).toEqual({
        start: "2026-10-26", end: CURRENT_END, tripCount: 0, seats: 0, fixed: 0, sold: 0, occupied: 0,
        rate: null, leftover: 0, empty: 0, earnings: 0,
      })
    }
  })

  it("caps the last day at Saturday", () => {
    expect(computeWeek(input, "all", "2026-10-19", "2026-10-30").end).toBe("2026-10-24")
  })

  it("counts a seat sold for an absentee once (the absence already freed it)", () => {
    const small: MetricsInput = {
      routes: [route("r1", "Itu", 3, ["mon"])],
      enrollments: [enrollment("r1", "a", "confirmed"), enrollment("r1", "b", "confirmed"), enrollment("r1", "c", "confirmed")],
      trips: [trip("r1", "2026-10-26")],
      absences: [absence("r1", "a", "2026-10-26")],
      singleTripOffers: [offer("o1", "r1", "2026-10-26")],
      singleTripBookings: [booking("bk1", "o1", "paid", 1800, "abs-r1-a-2026-10-26")],
    }
    expect(computeWeek(small, "all", "2026-10-26", "2026-10-26")).toMatchObject({
      fixed: 2, sold: 1, occupied: 3, leftover: 1, empty: 0, rate: 1,
    })
  })

  it("never lets fixed or empty go below 0", () => {
    const clamp: MetricsInput = {
      routes: [route("r1", "Itu", 3, ["mon"])],
      enrollments: [enrollment("r1", "a", "confirmed"), enrollment("r1", "b", "confirmed")],
      trips: [trip("r1", "2026-10-26")],
      // both confirmed students absent, plus a duplicated record of one of them: 3 absences for 2 students
      absences: [
        absence("r1", "a", "2026-10-26"), absence("r1", "b", "2026-10-26"),
        absence("r1", "a", "2026-10-26", "abs-dup"),
      ],
      singleTripOffers: [offer("o1", "r1", "2026-10-26")],
      singleTripBookings: [
        booking("k1", "o1", "paid", 100, null), booking("k2", "o1", "paid", 100, null),
        booking("k3", "o1", "paid", 100, null),
      ],
    }
    expect(computeWeek(clamp, "all", "2026-10-26", "2026-10-26")).toMatchObject({
      fixed: 0, leftover: 3, sold: 3, empty: 0,
    })
    const oversold: MetricsInput = {
      ...clamp,
      singleTripBookings: [...clamp.singleTripBookings, booking("k4", "o1", "paid", 100, null)],
    }
    expect(computeWeek(oversold, "all", "2026-10-26", "2026-10-26")).toMatchObject({ sold: 4, empty: 0 })
  })

  it("earnings is the sum of operatorShare of paid bookings only", () => {
    // rA 10-26 has a paid 1818 and a cancelled 1818; 10-27 a paid 2682 and a pending 2682
    expect(computeWeek(input, "rA", "2026-10-26", CURRENT_END).earnings).toBe(1818 + 2682)
  })

  describe("fixed seats (DEC-057: only a confirmed enrollment is a student who rides)", () => {
    const mixed: MetricsInput = {
      routes: [route("r1", "Itu", 5, ["mon", "tue", "wed"])],
      enrollments: [
        enrollment("r1", "a", "confirmed"), enrollment("r1", "b", "confirmed"),
        enrollment("r1", "c", "accepted"), enrollment("r1", "d", "requested"), enrollment("r1", "e", "cancelled"),
      ],
      trips: [trip("r1", "2026-10-26"), trip("r1", "2026-10-27"), trip("r1", "2026-10-28")],
      absences: [absence("r1", "c", "2026-10-26"), absence("r1", "a", "2026-10-27"), absence("r1", "b", "2026-10-27")],
      singleTripOffers: [], singleTripBookings: [],
    }

    it("counts only the confirmed students: accepted, requested and cancelled are not riders", () => {
      expect(computeWeek(mixed, "all", "2026-10-28", "2026-10-28")).toMatchObject({ fixed: 2, leftover: 3, empty: 3 })
    })

    it("an absence of an accepted (not yet confirmed) student does not free a seat", () => {
      expect(computeWeek(mixed, "all", "2026-10-26", "2026-10-26")).toMatchObject({ fixed: 2, leftover: 3 })
    })

    it("an absence of a confirmed student frees a seat", () => {
      expect(computeWeek(mixed, "all", "2026-10-27", "2026-10-27")).toMatchObject({ fixed: 0, leftover: 5 })
    })
  })
})

describe("compareWeeks", () => {
  const all = () => ({
    current: computeWeek(input, "all", "2026-10-26", CURRENT_END),
    previous: computeWeek(input, "all", "2026-10-19", PREV_END),
  })

  it("Todas: occupancy worse (64 vs 69), leftover better (33 vs 25), earnings worse (4500 vs 4636)", () => {
    const { current, previous } = all()
    expect(compareWeeks(current, previous)).toEqual({ occupancy: "worse", leftover: "better", earnings: "worse" })
  })

  it("rA: occupancy worse (63 vs 70), leftover better (40 vs 25), earnings better (4500 vs 3636)", () => {
    expect(compareWeeks(
      computeWeek(input, "rA", "2026-10-26", CURRENT_END), computeWeek(input, "rA", "2026-10-19", PREV_END),
    )).toEqual({ occupancy: "worse", leftover: "better", earnings: "better" })
  })

  it("rB: occupancy same (67 vs 67), leftover worse (0 vs 25), earnings worse (0 vs 1000)", () => {
    expect(compareWeeks(
      computeWeek(input, "rB", "2026-10-26", CURRENT_END), computeWeek(input, "rB", "2026-10-19", PREV_END),
    )).toEqual({ occupancy: "same", leftover: "worse", earnings: "worse" })
  })

  it("compares occupancy on the rounded percent: 0.7649 and 0.7551 are both 76 → same", () => {
    const result = compareWeeks(week({ rate: 0.7649 }), week({ rate: 0.7551 }))
    expect(result.occupancy).toBe("same")
  })

  it("compares the leftover sell-through on the rounded percent", () => {
    // 2/6 = 33% vs 1/3 = 33%
    expect(compareWeeks(week({ sold: 2, leftover: 6 }), week({ sold: 1, leftover: 3 })).leftover).toBe("same")
  })

  it("compares earnings in cents: one cent is enough", () => {
    expect(compareWeeks(week({ earnings: 1001 }), week({ earnings: 1000 })).earnings).toBe("better")
    expect(compareWeeks(week({ earnings: 1000 }), week({ earnings: 1000 })).earnings).toBe("same")
  })

  it("gives null on every card when the previous week has no trips", () => {
    const previous = week({ tripCount: 0, seats: 0, fixed: 0, sold: 0, occupied: 0, rate: null, leftover: 0, empty: 0, earnings: 0 })
    expect(compareWeeks(week(), previous)).toEqual({ occupancy: null, leftover: null, earnings: null })
  })

  it("gives null on every card when the current week has no trips", () => {
    const current = week({ tripCount: 0, seats: 0, fixed: 0, sold: 0, occupied: 0, rate: null, leftover: 0, empty: 0, earnings: 0 })
    expect(compareWeeks(current, week())).toEqual({ occupancy: null, leftover: null, earnings: null })
  })

  it("gives null only on the leftover card when the van is full (leftover 0) in either week", () => {
    const full = week({ fixed: 10, sold: 0, occupied: 10, rate: 1, leftover: 0, empty: 0 })
    expect(compareWeeks(full, week())).toEqual({ occupancy: "better", leftover: null, earnings: "same" })
    expect(compareWeeks(week(), full)).toEqual({ occupancy: "worse", leftover: null, earnings: "same" })
  })
})

describe("weeklySeries", () => {
  it("gives 8 weeks oldest first, the last one being today's week", () => {
    const series = weeklySeries(input, "all", TODAY)
    expect(series.map((p) => p.weekStart)).toEqual([
      "2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26",
    ])
  })

  it("leaves the weeks without trips at zero", () => {
    const series = weeklySeries(input, "all", TODAY)
    for (const point of series.slice(0, 6)) {
      expect(point).toMatchObject({ tripCount: 0, fixed: 0, singles: 0, empty: 0 })
    }
  })

  it("fills the previous week with fixed 17, singles 3, empty 9 and the current one up to today", () => {
    const series = weeklySeries(input, "all", TODAY)
    expect(series[6]).toEqual({ weekStart: "2026-10-19", tripCount: 8, fixed: 17, singles: 3, empty: 9 })
    expect(series[7]).toEqual({ weekStart: "2026-10-26", tripCount: 3, fixed: 5, singles: 2, empty: 4 })
  })

  it("respects the route filter", () => {
    const series = weeklySeries(input, "rB", TODAY)
    expect(series[6]).toEqual({ weekStart: "2026-10-19", tripCount: 3, fixed: 5, singles: 1, empty: 3 })
    expect(series[7]).toEqual({ weekStart: "2026-10-26", tripCount: 1, fixed: 2, singles: 0, empty: 1 })
  })

  it("gives only the last `weeks` points when asked for 2", () => {
    const series = weeklySeries(input, "all", TODAY, 2)
    expect(series.map((p) => p.weekStart)).toEqual(["2026-10-19", "2026-10-26"])
    expect(series[1]).toMatchObject({ fixed: 5, singles: 2, empty: 4 })
  })
})

describe("absencesByWeekday", () => {
  it("Todas: absences per 100 confirmed students per weekday, peak on Friday", () => {
    // mon 1/(3x2+2x2)=10, tue 3/(3x2)=50, wed 0/5, thu 0/3, fri 3/5=60.
    // The 10-28 trip and absence, the declined s6 and the return trip are not counted.
    expect(absencesByWeekday(input, "all", TODAY)).toEqual({
      days: [
        { weekday: "mon", percent: 10 }, { weekday: "tue", percent: 50 }, { weekday: "wed", percent: 0 },
        { weekday: "thu", percent: 0 }, { weekday: "fri", percent: 60 },
      ],
      peak: "fri",
    })
  })

  it("rB: days the route does not run are null", () => {
    expect(absencesByWeekday(input, "rB", TODAY)).toEqual({
      days: [
        { weekday: "mon", percent: 0 }, { weekday: "tue", percent: null }, { weekday: "wed", percent: 0 },
        { weekday: "thu", percent: null }, { weekday: "fri", percent: 50 },
      ],
      peak: "fri",
    })
  })

  it("a route without trips gives every day null and no peak", () => {
    expect(absencesByWeekday(input, "rC", TODAY)).toEqual({
      days: [
        { weekday: "mon", percent: null }, { weekday: "tue", percent: null }, { weekday: "wed", percent: null },
        { weekday: "thu", percent: null }, { weekday: "fri", percent: null },
      ],
      peak: null,
    })
  })

  it("gives no peak when the maximum is tied (50 and 50)", () => {
    const tie: MetricsInput = {
      routes: [route("r1", "Itu", 3, ["mon", "tue"])],
      enrollments: [enrollment("r1", "a", "confirmed"), enrollment("r1", "b", "confirmed")],
      trips: [trip("r1", "2026-10-26"), trip("r1", "2026-10-27")],
      absences: [absence("r1", "a", "2026-10-26"), absence("r1", "a", "2026-10-27")],
      singleTripOffers: [], singleTripBookings: [],
    }
    const result = absencesByWeekday(tie, "all", TODAY)
    expect(result.days.slice(0, 2)).toEqual([{ weekday: "mon", percent: 50 }, { weekday: "tue", percent: 50 }])
    expect(result.peak).toBeNull()
  })

  it("gives no peak when every day is 0", () => {
    const zero: MetricsInput = {
      routes: [route("r1", "Itu", 3, ["mon", "tue"])],
      enrollments: [enrollment("r1", "a", "confirmed")],
      trips: [trip("r1", "2026-10-26"), trip("r1", "2026-10-27")],
      absences: [], singleTripOffers: [], singleTripBookings: [],
    }
    expect(absencesByWeekday(zero, "all", TODAY).peak).toBeNull()
  })

  it("only looks at the last 8 weeks: 2026-08-31 is out, 2026-09-07 is in", () => {
    const window: MetricsInput = {
      routes: [route("r1", "Itu", 3, ["mon"])],
      enrollments: [enrollment("r1", "a", "confirmed"), enrollment("r1", "b", "confirmed")],
      trips: [trip("r1", "2026-08-31"), trip("r1", "2026-09-07")],
      absences: [absence("r1", "a", "2026-09-07")],
      singleTripOffers: [], singleTripBookings: [],
    }
    // only 09-07 counts: 1 / (2 x 1) = 50 (with 08-31 it would be 1 / 4 = 25)
    const result = absencesByWeekday(window, "all", TODAY)
    expect(result.days[0]).toEqual({ weekday: "mon", percent: 50 })
    expect(result.peak).toBe("mon")
  })

  it("an absence on 2026-08-31 is not counted either", () => {
    const old: MetricsInput = {
      routes: [route("r1", "Itu", 3, ["mon"])],
      enrollments: [enrollment("r1", "a", "confirmed"), enrollment("r1", "b", "confirmed")],
      trips: [trip("r1", "2026-08-31"), trip("r1", "2026-09-07")],
      absences: [absence("r1", "a", "2026-08-31")],
      singleTripOffers: [], singleTripBookings: [],
    }
    expect(absencesByWeekday(old, "all", TODAY).days[0]).toEqual({ weekday: "mon", percent: 0 })
  })
})

describe("buildDashboard", () => {
  it("is empty when the operator has no route", () => {
    expect(buildDashboard({ ...input, routes: [] }, "all", TODAY)).toEqual({
      status: "empty", week: { start: "2026-10-26", end: CURRENT_END },
    })
  })

  it("is empty when the operator's only route has no trip", () => {
    expect(buildDashboard({ ...input, routes: [rC] }, "all", TODAY)).toEqual({
      status: "empty", week: { start: "2026-10-26", end: CURRENT_END },
    })
  })

  it("is empty when the only outbound trip is older than 8 weeks", () => {
    const old: MetricsInput = { ...input, routes: [rA], trips: [trip("rA", "2026-08-31"), trip("rA", "2026-10-26", "return")] }
    expect(buildDashboard(old, "all", TODAY).status).toBe("empty")
  })

  it("Todas: assembles the week, comparison, series, weekdays and peak", () => {
    const dashboard = buildDashboard(input, "all", TODAY)
    expect(dashboard.status).toBe("ready")
    if (dashboard.status !== "ready") return
    expect(dashboard.filter).toBe("all")
    expect(dashboard.week).toEqual({ start: "2026-10-26", end: CURRENT_END })
    expect(dashboard.routes).toEqual([
      { id: "rA", label: "Itu" }, { id: "rB", label: "Salto" }, { id: "rC", label: "Sorocaba" },
    ])
    expect(dashboard.current).toMatchObject({ occupied: 7, seats: 11, rate: 7 / 11, sold: 2, earnings: 4500 })
    expect(dashboard.previous).toMatchObject({ start: "2026-10-19", end: PREV_END, occupied: 20, seats: 29, earnings: 4636 })
    expect(dashboard.comparison).toEqual({ occupancy: "worse", leftover: "better", earnings: "worse" })
    expect(dashboard.weeks).toHaveLength(8)
    expect(dashboard.weeks[7]).toEqual({ weekStart: "2026-10-26", tripCount: 3, fixed: 5, singles: 2, empty: 4 })
    expect(dashboard.absences.map((d) => d.percent)).toEqual([10, 50, 0, 0, 60])
    expect(dashboard.peakWeekday).toBe("fri")
  })

  it("a route filter changes every number", () => {
    const dashboard = buildDashboard(input, "rB", TODAY)
    expect(dashboard.status).toBe("ready")
    if (dashboard.status !== "ready") return
    expect(dashboard.filter).toBe("rB")
    expect(dashboard.current).toMatchObject({ occupied: 2, seats: 3 })
    expect(dashboard.previous).toMatchObject({ occupied: 6, seats: 9 })
    expect(dashboard.comparison).toEqual({ occupancy: "same", leftover: "worse", earnings: "worse" })
    expect(dashboard.absences.map((d) => d.percent)).toEqual([0, null, 0, null, 50])
  })

  it("a tab whose route has no trips is ready, with null rate, no comparison and no peak", () => {
    const dashboard = buildDashboard(input, "rC", TODAY)
    expect(dashboard.status).toBe("ready")
    if (dashboard.status !== "ready") return
    expect(dashboard.filter).toBe("rC")
    expect(dashboard.current.rate).toBeNull()
    expect(dashboard.current.tripCount).toBe(0)
    expect(dashboard.comparison).toEqual({ occupancy: null, leftover: null, earnings: null })
    expect(dashboard.peakWeekday).toBeNull()
  })

  it("an unknown route filter falls back to Todas and echoes it", () => {
    const dashboard = buildDashboard(input, "route-x", TODAY)
    expect(dashboard.status).toBe("ready")
    if (dashboard.status !== "ready") return
    expect(dashboard.filter).toBe("all")
    expect(dashboard.current).toMatchObject({ occupied: 7, seats: 11 })
  })

  it("on a Sunday shows the week that just ended, compared with the one before", () => {
    const dashboard = buildDashboard(input, "all", "2026-11-01")
    expect(dashboard.status).toBe("ready")
    if (dashboard.status !== "ready") return
    expect(dashboard.week).toEqual({ start: "2026-10-26", end: "2026-10-31" })
    expect(dashboard.current.end).toBe("2026-10-31")
    expect(dashboard.previous.start).toBe("2026-10-19")
  })
})
