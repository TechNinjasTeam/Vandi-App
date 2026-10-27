import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import routes from "@/mocks/routes.json"
import { clearAll, seed } from "./storage"
import { listExampleRoutes } from "./example"

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

describe("listExampleRoutes", () => {
  it("returns the 3 demo routes by default", async () => {
    expect(await listExampleRoutes()).toEqual(routes)
  })

  it("returns nothing when simulating the empty state", async () => {
    expect(await listExampleRoutes("empty")).toEqual([])
  })

  it("rejects with a Portuguese message when simulating the error state", async () => {
    await expect(listExampleRoutes("error")).rejects.toThrow("Não foi possível carregar as rotas.")
  })
})
