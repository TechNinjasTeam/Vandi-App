import type { Weekday } from "@/types"

// Dates as "YYYY-MM-DD" strings; date math in UTC to avoid DST.
/** The phone's LOCAL date (not toISOString). */
export function getToday(): string {
  throw new Error("not implemented")
}

export function addDays(date: string, days: number): string {
  throw new Error("not implemented")
}

/** First day AFTER today on a route weekday. */
export function getNextTripDate(weekdays: Weekday[], today: string): string {
  throw new Error("not implemented")
}
