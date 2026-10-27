import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearAll, seed } from "./storage"
import { countPendingRequests } from "./enrollments"

function makeFake() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size
    },
  }
}

beforeEach(() => {
  vi.stubGlobal("localStorage", makeFake())
  clearAll()
  seed("2026-10-30")
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("countPendingRequests", () => {
  it("counts only requested enrollments on the operator's routes", async () => {
    expect(await countPendingRequests("op-carlos")).toBe(1)
    expect(await countPendingRequests("op-ana")).toBe(0)
  })
})
