import { afterEach, describe, expect, it, vi } from "vitest"
import type { Weekday } from "@/types"
import { addDays, formatDayCaption, formatShortDay, getNextTripDate, getNow, getToday, getWeekStart } from "./clock"

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

describe("formatShortDay", () => {
  it.each([
    ["2026-10-17", "sáb, 17/10"],
    ["2026-10-18", "dom, 18/10"],
    ["2026-10-19", "seg, 19/10"],
    ["2026-11-04", "qua, 04/11"],
  ])("%s reads %s", (date, caption) => {
    expect(formatShortDay(date)).toBe(caption)
  })
})

describe("getNow", () => {
  it("is the local time with the phone's offset, on any timezone", () => {
    vi.useFakeTimers()
    const set = new Date(2026, 9, 27, 20, 15, 7)
    vi.setSystemTime(set)
    const now = getNow()
    expect(now).toMatch(/^2026-10-27T20:15:07[+-]\d{2}:\d{2}$/)
    expect(new Date(now).getTime()).toBe(set.getTime())
    expect(now.slice(0, 10)).toBe(getToday())
  })
})

describe("getWeekStart", () => {
  it("returns the Monday of the Mon-Sat week", () => {
    expect(getWeekStart("2026-10-26")).toBe("2026-10-26")
    expect(getWeekStart("2026-10-27")).toBe("2026-10-26")
    expect(getWeekStart("2026-10-31")).toBe("2026-10-26")
    expect(getWeekStart("2026-11-02")).toBe("2026-11-02")
    expect(getWeekStart("2026-10-01")).toBe("2026-09-28")
  })

  it("keeps a Sunday in the week that just ended", () => {
    expect(getWeekStart("2026-11-01")).toBe("2026-10-26")
  })
})
