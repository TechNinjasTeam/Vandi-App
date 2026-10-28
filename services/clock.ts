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
