// Pure price rules of the day pass (DEC-034, DEC-071). Money in cents.

/** Mon–Fri days of "YYYY-MM". 2026-10 → 22, 2026-11 → 21. */
export function businessDaysInMonth(month: string): number {
  const [year, m] = month.split("-").map(Number)
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate()
  let count = 0
  for (let d = 1; d <= days; d++) {
    const weekday = new Date(Date.UTC(year, m - 1, d)).getUTCDay()
    if (weekday !== 0 && weekday !== 6) count++
  }
  return count
}

/** ceil to R$ 5 of (monthlyPrice / businessDays) × 1.6, cents. (38000, 22) → 3000; (60000, 20) → 5000. */
export function singleTripPrice(monthlyPrice: number, businessDays: number): number {
  return Math.ceil(((monthlyPrice / businessDays) * 1.6) / 500) * 500
}

/** round(25% of price − day value). (3000, 38000, 22) → 318; (5000, 60000, 20) → 500. */
export function vandiFee(price: number, monthlyPrice: number, businessDays: number): number {
  return Math.round((price - monthlyPrice / businessDays) / 4)
}

/** One released leg sold = round(day value / 4). (38000, 22) → 432; (60000, 20) → 750. */
export function legCredit(monthlyPrice: number, businessDays: number): number {
  return Math.round(monthlyPrice / businessDays / 4)
}
