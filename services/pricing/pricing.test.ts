import { describe, expect, it } from "vitest"
import { businessDaysInMonth, legCredit, singleTripPrice, vandiFee } from "./pricing"

describe("businessDaysInMonth", () => {
  it("counts Monday to Friday of the month", () => {
    expect(businessDaysInMonth("2026-10")).toBe(22)
    expect(businessDaysInMonth("2026-11")).toBe(21)
  })
})

describe("singleTripPrice", () => {
  it("is the day value x 1.6 rounded up to R$ 5", () => {
    expect(singleTripPrice(38000, 22)).toBe(3000)
    expect(singleTripPrice(60000, 20)).toBe(5000)
  })
})

describe("vandiFee", () => {
  it("is 25% of the price above the day value", () => {
    expect(vandiFee(3000, 38000, 22)).toBe(318)
    expect(vandiFee(5000, 60000, 20)).toBe(500)
  })
})

describe("legCredit", () => {
  it("is a quarter of the day value", () => {
    expect(legCredit(38000, 22)).toBe(432)
    expect(legCredit(60000, 20)).toBe(750)
  })
})
