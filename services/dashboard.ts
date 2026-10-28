import type { Dashboard, RouteFilter } from "@/types"

// Contract stubs: the dashboard service sub-issue implements every body.

/** Reads storage, keeps only the operator's routes, delegates to buildDashboard. Never rejects on rule errors. */
export async function getDashboard(operatorId: string, routeFilter: RouteFilter, today: string): Promise<Dashboard> {
  void [operatorId, routeFilter, today]
  throw new Error("not implemented")
}

/** "R$ 121", "R$ 1,50", "R$ 1.234,56", "R$ 0". */
export function formatMoney(cents: number): string {
  void cents
  throw new Error("not implemented")
}

/** 0.636 → "64%"; null → "—". */
export function formatPercent(rate: number | null): string {
  void rate
  throw new Error("not implemented")
}

/** "5/10", "31/8" (no leading zeros). */
export function formatShortDate(date: string): string {
  void date
  throw new Error("not implemented")
}

/** "Semana de 26 a 27/10"; across months "Semana de 28/9 a 3/10"; start = end → "Semana de 26/10". */
export function formatWeekCaption(start: string, end: string): string {
  void [start, end]
  throw new Error("not implemented")
}
