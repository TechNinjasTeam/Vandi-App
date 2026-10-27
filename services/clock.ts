import type { Weekday } from "@/types"

// Dates as "YYYY-MM-DD" strings; date math in UTC to avoid DST.
const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat"]

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
