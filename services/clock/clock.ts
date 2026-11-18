import type { Weekday } from "@/types"

// Dates as "YYYY-MM-DD" strings; date math in UTC to avoid DST.
export const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat"]

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

/** The phone's LOCAL date (not toISOString). */
export function getToday(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** First day AFTER today on a route weekday. */
export function getNextTripDate(weekdays: Weekday[], today: string): string {
  for (let i = 1; i <= 7; i++) {
    const date = addDays(today, i)
    const day = WEEKDAYS[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7]
    if (weekdays.includes(day)) return date
  }
  throw new Error("route without weekdays")
}

/** "Segunda, 26/10" for "2026-10-26" (DEC-038, DEC-051). */
export function formatDayCaption(date: string): string {
  const day = DAY_NAMES[new Date(`${date}T00:00:00Z`).getUTCDay()]
  return `${day}, ${date.slice(8, 10)}/${date.slice(5, 7)}`
}

/** Now with the phone's offset: "2026-10-27T20:15:07-03:00". */
export function getNow(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const offset = -d.getTimezoneOffset()
  const sign = offset < 0 ? "-" : "+"
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  return `${getToday()}T${time}${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`
}

/** "sáb, 17/10" for "2026-10-17". */
export function formatShortDay(date: string): string {
  return `${DAY_NAMES[new Date(`${date}T00:00:00Z`).getUTCDay()].slice(0, 3).toLowerCase()}, ${date.slice(8, 10)}/${date.slice(5, 7)}`
}

/** Monday of the Mon–Sat week of `date`; a Sunday belongs to the week that just ended. */
export function getWeekStart(date: string): string {
  return addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7))
}

/** Local instant (ms) of `date` at `time`; NaN when `time` is not "HH:mm". */
export function toInstant(date: string, time: string): number {
  return /^\d{2}:\d{2}$/.test(time) ? new Date(`${date}T${time}`).getTime() : NaN
}

export function hoursBefore(instant: number, hours: number): number {
  return instant - hours * 3_600_000
}

/** "2026-10-30T05:50", phone's local time; "" for NaN. */
export function toLocalDateTime(instant: number): string {
  if (Number.isNaN(instant)) return ""
  const d = new Date(instant)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** First outbound departure after `now`, today included (≠ getNextTripDate, which skips today). */
export function getNextOutboundDate(weekdays: Weekday[], outboundTime: string, now: string): string {
  const nowMs = Date.parse(now)
  const today = toLocalDateTime(nowMs).slice(0, 10)
  for (let i = 0; i <= 7; i++) {
    const date = addDays(today, i)
    const day = WEEKDAYS[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7]
    if (weekdays.includes(day) && toInstant(date, outboundTime) > nowMs) return date
  }
  throw new Error("route without weekdays or outbound time")
}
