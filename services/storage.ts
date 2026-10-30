import type {
  Absence, Account, BoardingPoint, Enrollment, MonthlyFee, OutboundCallResponse, PushSubscription, ReturnCall,
  ReturnCallResponse, Route, SingleTripBooking, SingleTripOffer, Trip, Weekday,
} from "@/types"
import accounts from "@/mocks/accounts.json"
import boardingPoints from "@/mocks/boarding-points.json"
import enrollments from "@/mocks/enrollments.json"
import outboundCallResponses from "@/mocks/outbound-call-responses.json"
import routes from "@/mocks/routes.json"
import singleTripBookings from "@/mocks/single-trip-bookings.json"
import singleTripOffers from "@/mocks/single-trip-offers.json"
import historyAbsences from "@/mocks/history/absences.json"
import historyBookings from "@/mocks/history/single-trip-bookings.json"
import historyOffers from "@/mocks/history/single-trip-offers.json"
import historyTrips from "@/mocks/history/trips.json"
import { WEEKDAYS, addDays, getNextOutboundDate, getNow, getWeekStart, toLocalDateTime } from "./clock"

// The only file that touches localStorage. Sync on purpose: services wrap it.
export type Store = {
  accounts: Account[]; routes: Route[]; boardingPoints: BoardingPoint[]; enrollments: Enrollment[]
  trips: Trip[]; absences: Absence[]; returnCalls: ReturnCall[]; returnCallResponses: ReturnCallResponse[]
  singleTripOffers: SingleTripOffer[]; singleTripBookings: SingleTripBooking[]
  outboundCallResponses: OutboundCallResponse[]
  monthlyFees: MonthlyFee[]; pushSubscriptions: PushSubscription[]
}
export type Subject = keyof Store // key: `vandi:v4:${subject}`

const PREFIX = "vandi:v4:"
const TOKEN = /^(today([+-]\d+)?|next-outbound([+-]\d+)?|week-\d+-(mon|tue|wed|thu|fri|sat))(T\d{2}:\d{2})?$/

// JSON infers plain strings (role, tokens): cast to the contract. Subjects without a mock start empty.
const mocks = {
  accounts, routes, boardingPoints, enrollments, trips: historyTrips, absences: historyAbsences,
  returnCalls: [], returnCallResponses: [], singleTripOffers: [...singleTripOffers, ...historyOffers],
  singleTripBookings: [...singleTripBookings, ...historyBookings], outboundCallResponses, monthlyFees: [],
  pushSubscriptions: [],
} as unknown as Store

// In-memory copy per subject: keeps the app working without localStorage, with quota errors or corrupted JSON.
let memory: Partial<Store> = {}
let memorySession: string | null = null

function getItem(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}

/** Stored value of a subject, or undefined when never seeded (or unreadable). */
function load<S extends Subject>(subject: S): Store[S] | undefined {
  if (memory[subject]) return memory[subject]
  try {
    const raw = getItem(subject)
    if (raw !== null) return (memory[subject] = JSON.parse(raw))
  } catch {
    // corrupted JSON: treated as empty
  }
  return undefined
}

function resolve(value: string, now: string, today: string, record: Record<string, unknown>): string {
  const [dateToken, time] = value.split("T")
  let date: string
  if (dateToken.startsWith("next-outbound")) {
    // a booking has no routeId: its route is the one of its offer
    const routeId = record.routeId ?? mocks.singleTripOffers.find((o) => o.id === record.offerId)?.routeId
    const route = mocks.routes.find((r) => r.id === routeId)
    if (!route) throw new Error(`next-outbound without a route: ${value}`)
    date = addDays(getNextOutboundDate(route.weekdays, route.outboundTime, now), Number(dateToken.slice(13) || 0))
  } else if (dateToken.startsWith("week-")) {
    const [, weeks, day] = dateToken.split("-")
    date = addDays(getWeekStart(today), -7 * Number(weeks) + WEEKDAYS.indexOf(day as Weekday))
  } else {
    date = addDays(today, Number(dateToken.slice(5) || 0))
  }
  return time ? `${date}T${time}:00-03:00` : date
}

/** Resolves mocks on `now`, writes every subject with nothing stored. `now`: "YYYY-MM-DD" (read as 00:00 local) or an ISO instant. */
export function seed(now: string): void {
  const instant = /^\d{4}-\d{2}-\d{2}$/.test(now) ? `${now}T00:00` : now
  const today = toLocalDateTime(Date.parse(instant)).slice(0, 10)
  for (const subject of Object.keys(mocks) as Subject[]) {
    if (load(subject)) continue
    const data = (mocks[subject] as Record<string, unknown>[]).flatMap((record) => {
      const resolved = Object.fromEntries(
        Object.entries(record).map(([k, v]) => [
          k,
          typeof v === "string" && TOKEN.test(v) ? resolve(v, instant, today, record) : v,
        ]),
      )
      // A week-token record resolving after today is not seeded (current week only up to today).
      const future = Object.entries(record).some(
        ([k, v]) => typeof v === "string" && v.startsWith("week-") && String(resolved[k]).slice(0, 10) > today,
      )
      return future ? [] : [resolved]
    })
    write(subject, data as never)
  }
}

/** Nothing stored: seed(getNow()) first. */
export function read<S extends Subject>(subject: S): Store[S] {
  if (!load(subject)) seed(getNow())
  return memory[subject] as Store[S]
}

export function write<S extends Subject>(subject: S, data: Store[S]): void {
  memory[subject] = data
  try {
    localStorage.setItem(PREFIX + subject, JSON.stringify(data))
  } catch {
    // memory keeps the value
  }
}

/** Account id. */
export function readSession(): string | null {
  return getItem("session") ?? memorySession
}

/** null removes the key. */
export function writeSession(accountId: string | null): void {
  memorySession = accountId
  try {
    if (accountId === null) localStorage.removeItem(PREFIX + "session")
    else localStorage.setItem(PREFIX + "session", accountId)
  } catch {
    // memory keeps the value
  }
}

/** false when localStorage threw while removing. */
export function clearAll(): boolean {
  memory = {}
  memorySession = null
  try {
    localStorage.removeItem(PREFIX + "session")
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
    for (const key of keys) if (key?.startsWith(PREFIX)) localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}
