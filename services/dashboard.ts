import type { Dashboard, RouteFilter } from "@/types"
import { read } from "./storage"
import { buildDashboard } from "./metrics"

/** Reads storage, keeps only the operator's routes, delegates to buildDashboard. Never rejects on rule errors. */
export async function getDashboard(operatorId: string, routeFilter: RouteFilter, today: string): Promise<Dashboard> {
  return buildDashboard(
    {
      routes: read("routes").filter((r) => r.operatorId === operatorId),
      enrollments: read("enrollments"),
      trips: read("trips"),
      absences: read("absences"),
      singleTripOffers: read("singleTripOffers"),
      singleTripBookings: read("singleTripBookings"),
    },
    routeFilter,
    today,
  )
}

/** "R$ 121", "R$ 1,50", "R$ 1.234,56", "R$ 0". */
export function formatMoney(cents: number): string {
  const reais = Math.floor(cents / 100)
  const rest = cents % 100
  const int = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return rest === 0 ? `R$ ${int}` : `R$ ${int},${String(rest).padStart(2, "0")}`
}

/** 0.636 → "64%"; null → "—". */
export function formatPercent(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`
}

/** "5/10", "31/8" (no leading zeros). */
export function formatShortDate(date: string): string {
  const [, month, day] = date.split("-").map(Number)
  return `${day}/${month}`
}

/** "Semana de 26 a 27/10"; across months "Semana de 28/9 a 3/10"; start = end → "Semana de 26/10". */
export function formatWeekCaption(start: string, end: string): string {
  if (start === end) return `Semana de ${formatShortDate(start)}`
  const [, startMonth, startDay] = start.split("-").map(Number)
  const [, endMonth] = end.split("-").map(Number)
  const from = startMonth === endMonth ? String(startDay) : formatShortDate(start)
  return `Semana de ${from} a ${formatShortDate(end)}`
}
