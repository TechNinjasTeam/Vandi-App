import type { Dashboard, MetricsInput, RouteFilter, WeekComparison, WeekdayAbsence, WeekMetrics, Weekday, WeeklyPoint } from "@/types"

// Contract stubs: the metrics sub-issue implements every body.

/** Mon–Sat of today's week (Sunday → the week that just ended): { start: Monday, end: Saturday }. */
export function weekRange(today: string): { start: string; end: string } {
  void today
  throw new Error("not implemented")
}

/** Outbound trips of the filtered routes with weekStart ≤ date ≤ min(untilDate, Saturday), summed (spec "Por viagem de ida"). */
export function computeWeek(input: MetricsInput, filter: RouteFilter, weekStart: string, untilDate: string): WeekMetrics {
  void [input, filter, weekStart, untilDate]
  throw new Error("not implemented")
}

/** Per card: better / worse / same / null (rounded %, cents). */
export function compareWeeks(current: WeekMetrics, previous: WeekMetrics): WeekComparison {
  void [current, previous]
  throw new Error("not implemented")
}

/** `weeks` points, oldest first; the last is today's week counted up to today. */
export function weeklySeries(input: MetricsInput, filter: RouteFilter, today: string, weeks = 8): WeeklyPoint[] {
  void [input, filter, today, weeks]
  throw new Error("not implemented")
}

/** mon..fri: round(100 × absences / (accepted × trips)) over the `weeks` weeks up to today; peak null on tie or no data. */
export function absencesByWeekday(
  input: MetricsInput, filter: RouteFilter, today: string, weeks = 8,
): { days: WeekdayAbsence[]; peak: Exclude<Weekday, "sat"> | null } {
  void [input, filter, today, weeks]
  throw new Error("not implemented")
}

/** Everything Tela 12 needs. `input.routes` = the operator's routes. Empty: no route, or no outbound trip in the 8 weeks. */
export function buildDashboard(input: MetricsInput, filter: RouteFilter, today: string): Dashboard {
  void [input, filter, today]
  throw new Error("not implemented")
}
