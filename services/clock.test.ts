import { afterEach, describe, expect, it, vi } from "vitest"
import type { Weekday } from "@/types"
import { addDays, formatDayCaption, getNextTripDate, getToday } from "./clock"

afterEach(() => {
  vi.useRealTimers()
})

describe("getToday", () => {
  it("uses the local date late in the evening, not the UTC one", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 30, 23, 30))
    expect(getToday()).toBe("2026-10-30")
  })
})

describe("addDays", () => {
  it("crosses month boundaries in both directions", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01")
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31")
  })
})

describe("getNextTripDate", () => {
  const monToFri: Weekday[] = ["mon", "tue", "wed", "thu", "fri"]
  const monWedFri: Weekday[] = ["mon", "wed", "fri"]

  it("returns the first day after today on a route weekday (mon-fri)", () => {
    expect(getNextTripDate(monToFri, "2026-10-30")).toBe("2026-11-02")
    expect(getNextTripDate(monToFri, "2026-10-26")).toBe("2026-10-27")
  })

  it("skips days off and never returns today (mon, wed, fri)", () => {
    expect(getNextTripDate(monWedFri, "2026-10-26")).toBe("2026-10-28")
    expect(getNextTripDate(monWedFri, "2026-10-30")).toBe("2026-11-02")
    expect(getNextTripDate(monWedFri, "2026-10-31")).toBe("2026-11-02")
  })
})

describe("formatDayCaption", () => {
  it.each([
    ["2026-10-26", "Segunda, 26/10"],
    ["2026-10-30", "Sexta, 30/10"],
    ["2026-10-31", "Sábado, 31/10"],
    ["2026-11-01", "Domingo, 01/11"],
  ])("%s reads %s", (date, caption) => {
    expect(formatDayCaption(date)).toBe(caption)
  })
})
