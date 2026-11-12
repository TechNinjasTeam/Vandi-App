import { afterEach, describe, expect, it, vi } from "vitest"
import type { Weekday } from "@/types"
import {
  addDays, formatDayCaption, formatShortDay, getNextOutboundDate, getNextTripDate, getNow, getToday, getWeekStart,
  hoursBefore, toInstant, toLocalDateTime,
} from "./clock"

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

const at = (date: string, time: string) => new Date(toInstant(date, time)).toISOString()

describe("toInstant", () => {
  it("is local: one day apart is 24 h and the hour is the typed one", () => {
    expect(toInstant("2026-10-30", "17:50") - toInstant("2026-10-29", "17:50")).toBe(86_400_000)
    expect(new Date(toInstant("2026-10-30", "17:50")).getHours()).toBe(17)
  })

  it("is NaN when the time is not HH:mm", () => {
    expect(toInstant("2026-10-30", "")).toBeNaN()
    expect(toInstant("2026-10-30", "25:00")).toBeNaN()
  })
})

describe("hoursBefore", () => {
  it("subtracts whole hours in ms", () => {
    const x = toInstant("2026-10-30", "17:50")
    expect(hoursBefore(x, 12)).toBe(x - 43_200_000)
  })
})

describe("toLocalDateTime", () => {
  it("formats the phone's local time without seconds", () => {
    expect(toLocalDateTime(toInstant("2026-10-30", "05:50"))).toBe("2026-10-30T05:50")
  })

  it("is empty for NaN", () => {
    expect(toLocalDateTime(NaN)).toBe("")
  })
})

describe("getNextOutboundDate", () => {
  const monToFri: Weekday[] = ["mon", "tue", "wed", "thu", "fri"]
  const monWedFri: Weekday[] = ["mon", "wed", "fri"]

  it("keeps today until the departure, then moves to the next route day", () => {
    expect(getNextOutboundDate(monToFri, "17:50", at("2026-10-30", "17:49"))).toBe("2026-10-30")
    expect(getNextOutboundDate(monToFri, "17:50", at("2026-10-30", "17:50"))).toBe("2026-11-02")
  })

  it("skips the weekend and days off", () => {
    expect(getNextOutboundDate(monToFri, "17:50", at("2026-10-31", "08:00"))).toBe("2026-11-02")
    expect(getNextOutboundDate(monWedFri, "17:50", at("2026-10-29", "10:00"))).toBe("2026-10-30")
  })
})
