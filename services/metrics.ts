import type { Dashboard, MetricsInput, RouteFilter, Trend, WeekComparison, WeekdayAbsence, WeekMetrics, Weekday, WeeklyPoint } from "@/types"
import { addDays, getWeekStart, WEEKDAYS } from "@/services/clock"

type Peak = Exclude<Weekday, "sat">

/** Mon–Sat of today's week (Sunday → the week that just ended): { start: Monday, end: Saturday }. */
export function weekRange(today: string): { start: string; end: string } {
  const start = getWeekStart(today)
  return { start, end: addDays(start, 5) }
}

/** Routes the filter selects; an unknown id selects none. */
function filteredRoutes(input: MetricsInput, filter: RouteFilter) {
  return filter === "all" ? input.routes : input.routes.filter((r) => r.id === filter)
}

/** Outbound trips of the filtered routes with from ≤ date ≤ to, each with its route. */
function outboundTrips(input: MetricsInput, filter: RouteFilter, from: string, to: string) {
  const routes = filteredRoutes(input, filter)
  return input.trips.flatMap((trip) => {
    const route = routes.find((r) => r.id === trip.routeId)
    return route && trip.direction === "outbound" && trip.date >= from && trip.date <= to ? [{ trip, route }] : []
  })
}

/** Accepted students of a route and how many of them are absent that day. */
function acceptedAndAbsent(input: MetricsInput, routeId: string, date: string) {
  const accepted = new Set(
    input.enrollments.filter((e) => e.routeId === routeId && e.status === "accepted").map((e) => e.studentId),
  )
  const absent = input.absences.filter((a) => a.routeId === routeId && a.date === date && accepted.has(a.studentId)).length
  return { accepted: accepted.size, absent }
}

/** Outbound trips of the filtered routes with weekStart ≤ date ≤ min(untilDate, Saturday), summed (spec "Por viagem de ida"). */
export function computeWeek(input: MetricsInput, filter: RouteFilter, weekStart: string, untilDate: string): WeekMetrics {
  const saturday = addDays(weekStart, 5)
  const end = untilDate < saturday ? untilDate : saturday
  let seats = 0, fixed = 0, sold = 0, leftover = 0, empty = 0, earnings = 0
  const trips = outboundTrips(input, filter, weekStart, end)
  for (const { trip, route } of trips) {
    const { accepted, absent } = acceptedAndAbsent(input, route.id, trip.date)
    const offerIds = input.singleTripOffers.filter((o) => o.routeId === route.id && o.date === trip.date).map((o) => o.id)
    const paid = input.singleTripBookings.filter((b) => b.status === "paid" && offerIds.includes(b.offerId))
    const tripFixed = Math.max(0, accepted - absent)
    const tripLeftover = route.seats - tripFixed
    seats += route.seats
    fixed += tripFixed
    sold += paid.length
    leftover += tripLeftover
    empty += Math.max(0, tripLeftover - paid.length)
    earnings += paid.reduce((sum, b) => sum + b.operatorShare, 0)
  }
  const occupied = fixed + sold
  return {
    start: weekStart, end, tripCount: trips.length, seats, fixed, sold, occupied,
    rate: trips.length === 0 ? null : occupied / seats, leftover, empty, earnings,
  }
}

function trend(current: number, previous: number): Trend {
  return current > previous ? "better" : current < previous ? "worse" : "same"
}

const percent = (part: number, whole: number) => Math.round((100 * part) / whole)

/** Per card: better / worse / same / null (rounded %, cents). */
export function compareWeeks(current: WeekMetrics, previous: WeekMetrics): WeekComparison {
  if (current.tripCount === 0 || previous.tripCount === 0) return { occupancy: null, leftover: null, earnings: null }
  return {
    occupancy: trend(Math.round((current.rate ?? 0) * 100), Math.round((previous.rate ?? 0) * 100)),
    leftover: current.leftover === 0 || previous.leftover === 0
      ? null
      : trend(percent(current.sold, current.leftover), percent(previous.sold, previous.leftover)),
    earnings: trend(current.earnings, previous.earnings),
  }
}

/** `weeks` points, oldest first; the last is today's week counted up to today. */
export function weeklySeries(input: MetricsInput, filter: RouteFilter, today: string, weeks = 8): WeeklyPoint[] {
  const thisMonday = getWeekStart(today)
  return Array.from({ length: weeks }, (_, i) => {
    const w = computeWeek(input, filter, addDays(thisMonday, -7 * (weeks - 1 - i)), today)
    return { weekStart: w.start, tripCount: w.tripCount, fixed: w.fixed, singles: w.sold, empty: w.empty }
  })
}

/** mon..fri: round(100 × absences / (accepted × trips)) over the `weeks` weeks up to today; peak null on tie or no data. */
export function absencesByWeekday(
  input: MetricsInput, filter: RouteFilter, today: string, weeks = 8,
): { days: WeekdayAbsence[]; peak: Peak | null } {
  const from = addDays(getWeekStart(today), -7 * (weeks - 1))
  const totals = new Map<Weekday, { absent: number; capacity: number }>()
  for (const { trip, route } of outboundTrips(input, filter, from, today)) {
    const day = WEEKDAYS[(new Date(`${trip.date}T00:00:00Z`).getUTCDay() + 6) % 7]
    const { accepted, absent } = acceptedAndAbsent(input, route.id, trip.date)
    const t = totals.get(day) ?? { absent: 0, capacity: 0 }
    totals.set(day, { absent: t.absent + absent, capacity: t.capacity + accepted })
  }
  const days = WEEKDAYS.slice(0, 5).map((weekday) => {
    const t = totals.get(weekday)
    return { weekday: weekday as Peak, percent: t ? (t.capacity === 0 ? 0 : percent(t.absent, t.capacity)) : null }
  })
  const max = Math.max(0, ...days.map((d) => d.percent ?? 0))
  const top = days.filter((d) => d.percent === max)
  return { days, peak: max > 0 && top.length === 1 ? top[0].weekday : null }
}

/** Everything Tela 12 needs. `input.routes` = the operator's routes. Empty: no route, or no outbound trip in the 8 weeks. */
export function buildDashboard(input: MetricsInput, filter: RouteFilter, today: string): Dashboard {
  const range = weekRange(today)
  const week = { start: range.start, end: today < range.end ? today : range.end }
  const from = addDays(range.start, -7 * 7)
  if (outboundTrips(input, "all", from, today).length === 0) return { status: "empty", week }

  const active = filter !== "all" && input.routes.some((r) => r.id === filter) ? filter : "all"
  const current = computeWeek(input, active, range.start, today)
  const previous = computeWeek(input, active, addDays(range.start, -7), addDays(range.start, -2))
  const { days, peak } = absencesByWeekday(input, active, today)
  return {
    status: "ready", week, filter: active,
    routes: input.routes.map((r) => ({ id: r.id, label: r.origin })),
    current, previous, comparison: compareWeeks(current, previous),
    weeks: weeklySeries(input, active, today), absences: days, peakWeekday: peak,
  }
}
