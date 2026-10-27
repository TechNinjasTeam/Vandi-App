import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import routes from "@/mocks/routes.json"
import type { Account } from "@/types"
import { clearAll, read, readSession, seed, write, writeSession } from "./storage"
import { getCurrentAccount, getInitialPath, restoreDemoData, signIn, signOut } from "./session"

function makeFake(overrides: Record<string, unknown> = {}) {
  const map = new Map<string, string>()
  return {
    map,
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
    ...overrides,
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

describe("without a valid session", () => {
  it("no session goes to /sign-in", async () => {
    expect(await getCurrentAccount()).toBeNull()
    expect(await getInitialPath()).toBe("/sign-in")
  })

  it("a session whose account does not exist counts as no session", async () => {
    writeSession("acc-missing")
    expect(await getCurrentAccount()).toBeNull()
    expect(await getInitialPath()).toBe("/sign-in")
  })
})

describe("getCurrentAccount", () => {
  it("reads the role from the account, not from the session", async () => {
    writeSession("op-carlos")
    write("accounts", read("accounts").map((a) => (a.id === "op-carlos" ? ({ ...a, role: "student" } as Account) : a)))
    expect((await getCurrentAccount())?.role).toBe("student")
  })
})

describe("getInitialPath", () => {
  it.each([
    ["op-carlos", "/operator"],
    ["st-rafael-moura", "/student/vans"],
    ["st-beatriz-campos", "/student/my-route"], // requested: Minha rota shows "aguardando"
    ["st-mateus-lima", "/student/my-route"],
    ["st-lia-ferraz", "/student/my-route"],
    ["st-julia-prado", "/student/my-route"], // pending booking
    ["st-gustavo-reis", "/student/my-route"], // paid booking
  ])("%s lands on %s", async (id, path) => {
    writeSession(id)
    expect(await getInitialPath()).toBe(path)
  })

  it("a cancelled single-trip booking no longer counts as a route", async () => {
    write(
      "singleTripBookings",
      read("singleTripBookings").map((b) => (b.id === "booking-gustavo" ? { ...b, status: "cancelled" as const } : b)),
    )
    writeSession("st-gustavo-reis")
    expect(await getInitialPath()).toBe("/student/vans")
  })
})

describe("signOut", () => {
  it("clears the session", async () => {
    writeSession("op-carlos")
    expect(await signOut()).toEqual({ ok: true, data: null })
    expect(await getCurrentAccount()).toBeNull()
  })
})

describe("restoreDemoData", () => {
  it("returns to the mocks re-anchored on the given day and removes the login", async () => {
    expect(read("singleTripOffers")[0].date).toBe("2026-11-02")
    write("routes", [])
    writeSession("op-carlos")
    expect(await restoreDemoData("2026-11-02")).toEqual({ ok: true, data: null })
    expect(read("routes")).toEqual(routes)
    expect(read("singleTripOffers")[0].date).toBe("2026-11-03")
    expect(readSession()).toBeNull()
  })

  it("reports a Portuguese error when storage cannot be cleared", async () => {
    vi.stubGlobal("localStorage", makeFake({ removeItem: () => { throw new Error("blocked") } }))
    expect(await restoreDemoData("2026-10-30")).toEqual({
      ok: false,
      error: "Não foi possível restaurar os dados. Tente de novo.",
    })
  })
})

describe("signIn", () => {
  it.each([
    ["carlos@vandi.test", "op-carlos"],
    ["aluno.sem-vaga@vandi.test", "st-rafael-moura"],
    ["aluno.aguardando@vandi.test", "st-beatriz-campos"],
    ["aluno.fixo@vandi.test", "st-mateus-lima"],
    ["aluno.falta@vandi.test", "st-lia-ferraz"],
    ["aluno.avulso-pendente@vandi.test", "st-julia-prado"],
    ["aluno.avulso-pago@vandi.test", "st-gustavo-reis"],
  ])("%s enters with the demo password and opens the session", async (email, id) => {
    const result = await signIn(email, "vandi123")
    expect(result.ok && result.data.id).toBe(id)
    expect(readSession()).toBe(id)
  })

  it("ignores case and spaces around the e-mail", async () => {
    const result = await signIn(" Aluno.Fixo@VANDI.test ", "vandi123")
    expect(result.ok && result.data.id).toBe("st-mateus-lima")
  })

  it.each([
    ["wrong password", "aluno.fixo@vandi.test", "VANDI123"],
    ["unknown e-mail", "ninguem@vandi.test", "vandi123"],
    ["empty password", "aluno.fixo@vandi.test", ""],
    ["support account with empty password", "ana.ribeiro@vandi.test", ""],
  ])("%s gets one message and no session", async (_case, email, password) => {
    expect(await signIn(email, password)).toEqual({ ok: false, error: "E-mail ou senha incorretos." })
    expect(readSession()).toBeNull()
  })
})
