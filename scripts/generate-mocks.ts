import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import type { Weekday } from "../types"

// Writes the eight-week demo history (mocks/history/*.json). Deterministic: fixed seed, no clock.
// Dates are week tokens ("week-3-fri[THH:mm]"), resolved by services/storage.ts against today's week.

const SEED = 20261027
const WEEKS = 8
const DAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat"]

// Tune only these constants: absences per trip (base + jitter) and paid singles per trip (base + jitter).
const ABSENCE_BASE: Record<string, Partial<Record<Weekday, number>>> = {
  "route-carlos": { mon: 1, tue: 1, wed: 1, thu: 1, fri: 3 },
  "route-ana": { mon: 1, wed: 1, fri: 2 },
  "route-marcia": { mon: 1, wed: 1, fri: 2 },
}
const FRIDAY_JITTER = [0, 1]
const OTHER_JITTER = [-1, 0, 0, 1]
const PAID_BASE: Record<string, number> = { "route-carlos": 0, "route-ana": 0, "route-marcia": 0 }

type Route = { id: string; weekdays: Weekday[]; seats: number; monthlyPrice: number }
type Enrollment = { routeId: string; studentId: string; boardingPointId: string; status: string }
type Account = { id: string; role: string; password: string }
type BoardingPoint = { id: string; routeId: string }
type Absence = { id: string; studentId: string; routeId: string; date: string; reportedAt: string }
type Booking = {
  id: string; offerId: string; studentId: string; boardingPointId: string; absenceId: string | null
  price: number; vandiFee: number; operatorShare: number; creditAmount: number; creditUsed: 0
  status: "paid" | "pending" | "cancelled"; createdAt: string
}

const readMock = <T>(file: string): T[] =>
  JSON.parse(readFileSync(path.join(process.cwd(), "mocks", file), "utf8"))

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const random = mulberry32(SEED)
const pick = <T>(list: T[]): T => list[Math.floor(random() * list.length)]
function shuffle<T>(list: T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
const pad = (n: number) => String(n).padStart(2, "0")
const clock = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
const check = (ok: boolean, message: string) => {
  if (!ok) throw new Error(`generate-mocks: ${message}`)
}
const short = (id: string, prefix: string) => id.replace(new RegExp(`^${prefix}-`), "")

const routes = readMock<Route>("routes.json")
const enrollments = readMock<Enrollment>("enrollments.json")
const accounts = readMock<Account>("accounts.json")
const points = readMock<BoardingPoint>("boarding-points.json")
const support = new Set(accounts.filter((a) => a.role === "student" && a.password === "").map((a) => a.id))

const trips: { id: string; routeId: string; date: string; direction: "outbound" }[] = []
const absences: Absence[] = []
const offers: { id: string; routeId: string; date: string; seats: number; createdAt: string }[] = []
const bookings: Booking[] = []
const stats = { seats: 0, occupied: 0, paid: 0 }
const paidByWeek = Array<number>(WEEKS).fill(0)
// Absences and confirmed-seat capacity per weekday: overall and per route (Friday must be the peak).
const overall: Record<string, { abs: number; cap: number }> = {}
const perRoute: Record<string, Record<string, { abs: number; cap: number }>> = {}

for (let week = WEEKS - 1; week >= 0; week--) {
  for (const day of DAYS) {
    for (const route of routes) {
      if (!route.weekdays.includes(day)) continue
      const name = short(route.id, "route")
      const token = `week-${week}-${day}`
      const suffix = `w${week}-${day}`
      const confirmed = enrollments.filter((e) => e.routeId === route.id && e.status === "confirmed")
      const supportConfirmed = confirmed.filter((e) => support.has(e.studentId))
      const enrolledIds = new Set(enrollments.filter((e) => e.routeId === route.id).map((e) => e.studentId))
      const routePoints = points.filter((p) => p.routeId === route.id)

      trips.push({ id: `trip-${name}-${suffix}`, routeId: route.id, date: token, direction: "outbound" })

      // Absences
      const jitter = pick(day === "fri" ? FRIDAY_JITTER : OTHER_JITTER)
      const count = Math.min(Math.max((ABSENCE_BASE[route.id][day] ?? 1) + jitter, 0), supportConfirmed.length)
      const tripAbsences: Absence[] = shuffle(supportConfirmed).slice(0, count).map((e, i) => ({
        id: `abs-${name}-${suffix}-${short(e.studentId, "st")}`,
        studentId: e.studentId,
        routeId: route.id,
        date: token,
        reportedAt: `${token}T${clock(7 * 60 + i * 35 + Math.floor(random() * 20))}`,
      }))
      absences.push(...tripAbsences)
      for (const bucket of [(overall[day] ??= { abs: 0, cap: 0 }), ((perRoute[route.id] ??= {})[day] ??= { abs: 0, cap: 0 })]) {
        bucket.abs += count
        bucket.cap += confirmed.length
      }

      // Offer
      const fixed = confirmed.length - count
      const leftover = route.seats - fixed
      stats.seats += route.seats
      if (leftover <= 0) {
        stats.occupied += fixed
        continue
      }
      const offerId = `offer-${name}-${suffix}`
      offers.push({ id: offerId, routeId: route.id, date: token, seats: leftover, createdAt: `${token}T14:00` })

      // Bookings: absentees' seats first, then seats with no owner (DEC-034); price per DEC-034 with 22 working days
      const paidCount = Math.min(leftover, Math.floor(PAID_BASE[route.id] + random() * 2 + count / 2))
      const extra = random() < 0.35 && paidCount < leftover ? pick(["pending", "cancelled"] as const) : null
      const buyers = shuffle([...support].filter((id) => !enrolledIds.has(id)))
      const day22 = route.monthlyPrice / 22
      const price = Math.ceil((day22 * 1.6) / 500) * 500
      const vandiFee = Math.round((price - day22) / 4)
      const plan: { status: Booking["status"]; absenceId: string | null }[] = []
      for (let k = 0; k < paidCount; k++) plan.push({ status: "paid", absenceId: tripAbsences[k]?.id ?? null })
      if (extra) plan.push({ status: extra, absenceId: null })
      plan.forEach(({ status, absenceId }, k) => {
        const creditAmount = absenceId ? Math.round(day22 / 2) : 0
        bookings.push({
          id: `booking-${name}-${suffix}-${k + 1}`,
          offerId,
          studentId: buyers[k],
          boardingPointId: pick(routePoints).id,
          absenceId,
          price,
          vandiFee,
          operatorShare: price - vandiFee - creditAmount,
          creditAmount,
          creditUsed: 0,
          status,
          createdAt: `${token}T${clock(14 * 60 + 10 + k * 10)}`,
        })
      })
      stats.occupied += fixed + paidCount
      stats.paid += paidCount
      paidByWeek[week] += paidCount
    }
  }
}

// Self-checks: any failure aborts before writing.
for (const route of routes) {
  const n = trips.filter((t) => t.routeId === route.id).length
  check(n === WEEKS * route.weekdays.length, `${route.id} needs ${WEEKS} weeks`)
}
for (const r of [...absences, ...bookings]) check(support.has(r.studentId), `${r.id} uses a login account`)
const offerById = new Map(offers.map((o) => [o.id, o]))
const absenceById = new Map(absences.map((a) => [a.id, a]))
for (const b of bookings) {
  if (!b.absenceId) continue
  const a = absenceById.get(b.absenceId)
  const offer = offerById.get(b.offerId)
  check(!!a && !!offer && a.routeId === offer.routeId && a.date === offer.date, `${b.id} absence mismatch`)
}
for (const o of offers) {
  const live = bookings.filter((b) => b.offerId === o.id && b.status !== "cancelled").length
  check(live <= o.seats, `${o.id} oversold`)
}
const fridayPeak = (days: Record<string, { abs: number; cap: number }>) =>
  Object.keys(days).every((d) => d === "fri" || days.fri.abs / days.fri.cap > days[d].abs / days[d].cap)
check(fridayPeak(overall), "Friday is not the overall peak")
for (const route of routes) check(fridayPeak(perRoute[route.id]), `Friday is not the peak of ${route.id}`)
const occupancy = stats.occupied / stats.seats
const perWeek = stats.paid / WEEKS
console.log(`occupancy ${(occupancy * 100).toFixed(1)}%, paid per week ${perWeek.toFixed(1)} [${paidByWeek.join(", ")}]`)
check(occupancy >= 0.72 && occupancy <= 0.8, "occupancy outside 72-80%")
check(perWeek >= 12 && perWeek <= 16, "paid singles per week outside 12-16")

const dir = path.join(process.cwd(), "mocks", "history")
mkdirSync(dir, { recursive: true })
const save = (file: string, data: unknown) => writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2) + "\n")
save("trips.json", trips)
save("absences.json", absences)
save("single-trip-offers.json", offers)
save("single-trip-bookings.json", bookings)
