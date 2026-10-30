import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import accounts from "@/mocks/accounts.json"
import routes from "@/mocks/routes.json"
import type { Account } from "@/types"
import { clearAll, read, readSession, seed, write, writeSession } from "./storage"
import { getCurrentAccount, getInitialPath, restoreDemoData, signIn, signOut, signUp } from "./session"

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
    ["st-laura-bastos", "/student/my-route"], // requested + accepted
    ["st-julia-prado", "/student/my-route"], // pending booking
    ["st-gustavo-reis", "/student/my-route"], // paid booking
  ])("%s lands on %s", async (id, path) => {
    writeSession(id)
    expect(await getInitialPath()).toBe(path)
  })

  it.each(["declined", "cancelled"] as const)("a %s enrollment alone does not count as a route", async (status) => {
    write("enrollments", read("enrollments").map((e) => (e.id === "enr-beatriz-campos" ? { ...e, status } : e)))
    writeSession("st-beatriz-campos")
    expect(await getInitialPath()).toBe("/student/vans")
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
    expect(read("singleTripOffers")[0].date).toBe("2026-10-30")
    write("routes", [])
    writeSession("op-carlos")
    expect(await restoreDemoData("2026-11-02")).toEqual({ ok: true, data: null })
    expect(read("routes")).toEqual(routes)
    expect(read("singleTripOffers")[0].date).toBe("2026-11-02")
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
    ["aluno.escolher@vandi.test", "st-laura-bastos"],
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

const valid = {
  role: "student" as const,
  name: "  Maria Souza ",
  phone: "(15) 99999-0000",
  email: " Maria@Email.com ",
  password: "12345678",
}

async function fieldErrorsOf(input: Partial<typeof valid>) {
  const result = await signUp({ ...valid, ...input })
  return result.ok ? {} : (result.fieldErrors ?? {})
}

describe("signUp validation", () => {
  it("refuses an empty name", async () => {
    expect(await signUp({ ...valid, name: "   " })).toEqual({
      ok: false,
      error: "Digite seu nome.",
      fieldErrors: { name: "Digite seu nome." },
    })
  })

  it.each(["nome@email", "nome email@x.com", ""])("refuses the invalid e-mail %j", async (email) => {
    expect((await fieldErrorsOf({ email })).email).toBe("Digite um e-mail válido, ex.: nome@email.com")
  })

  it("refuses an e-mail that already has an account, ignoring case and spaces", async () => {
    expect((await fieldErrorsOf({ email: " Aluno.Fixo@VANDI.test " })).email).toBe(
      "Esse e-mail já tem conta. Entre ou use outro e-mail.",
    )
  })

  it.each(["99999-0000", "+55 15 99999-0000"])("refuses the phone %j without a DDD or with a country code", async (phone) => {
    expect((await fieldErrorsOf({ phone })).phone).toBe("Coloque o DDD, ex.: 15 99999-0000")
  })

  it.each(["1599990000", "(15) 99999-0000"])("accepts the phone %j with 10 or 11 digits", async (phone) => {
    const result = await signUp({ ...valid, phone })
    expect(result.ok).toBe(true)
    expect(result.ok ? undefined : result.fieldErrors?.phone).toBeUndefined()
  })

  it("requires 8 characters in the password", async () => {
    expect((await fieldErrorsOf({ password: "1234567" })).password).toBe("A senha precisa ter pelo menos 8 caracteres.")
    expect((await signUp({ ...valid, password: "12345678" })).ok).toBe(true)
  })

  it("reports every invalid field at once, repeats the first in error and saves nothing", async () => {
    const result = await signUp({ role: "student", name: "", phone: "1", email: "x", password: "1" })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Object.keys(result.fieldErrors ?? {}).sort()).toEqual(["email", "name", "password", "phone"])
    expect(result.error).toBe("Digite seu nome.")
    expect(read("accounts")).toHaveLength(45)
    expect(readSession()).toBeNull()
  })
})

describe("signUp write", () => {
  it("stores the cleaned-up account and opens the session on the student path", async () => {
    const expected = {
      id: "st-maria-souza",
      name: "Maria Souza",
      email: "maria@email.com",
      password: "12345678",
      role: "student",
      phone: "(15) 99999-0000",
    }
    expect(await signUp(valid)).toEqual({ ok: true, data: expected })
    expect(read("accounts")).toContainEqual(expected)
    expect(readSession()).toBe("st-maria-souza")
    expect(await getInitialPath()).toBe("/student/vans")
  })

  it.each([
    ["15999990000", "(15) 99999-0000"],
    ["1533334444", "(15) 3333-4444"],
  ])("stores the phone %s masked as %s", async (phone, masked) => {
    const result = await signUp({ ...valid, phone })
    expect(result.ok && result.data.phone).toBe(masked)
  })

  it("creates an operator with an op- id and sends them to /operator", async () => {
    const result = await signUp({ ...valid, role: "operator", name: "Júlia Ávila" })
    expect(result.ok && result.data.id).toBe("op-julia-avila")
    expect(await getInitialPath()).toBe("/operator")
  })

  it("never reuses an id: a namesake does not inherit the demo account's data", async () => {
    const first = await signUp({ ...valid, name: "Mateus Lima", email: "a@email.com" })
    const second = await signUp({ ...valid, name: "Mateus Lima", email: "b@email.com" })
    expect(first.ok && first.data.id).toBe("st-mateus-lima-2")
    expect(second.ok && second.data.id).toBe("st-mateus-lima-3")
    expect(read("accounts").find((a) => a.id === "st-mateus-lima")?.email).toBe("aluno.fixo@vandi.test")
  })

  it("falls back to the account slug when the name has no letters or digits", async () => {
    const result = await signUp({ ...valid, name: "???" })
    expect(result.ok && result.data.id).toBe("st-account")
  })

  it("keeps the login after a reload", async () => {
    await signUp(valid)
    vi.resetModules()
    const reloaded = await import("./session")
    expect((await reloaded.getCurrentAccount())?.id).toBe("st-maria-souza")
  })

  it("lets the new account sign in after signing out", async () => {
    await signUp(valid)
    await signOut()
    const result = await signIn("maria@email.com", "12345678")
    expect(result.ok).toBe(true)
  })

  it("restoring the demo data removes the created accounts", async () => {
    await signUp(valid)
    await restoreDemoData("2026-10-30")
    expect(read("accounts")).toEqual(accounts)
    expect(await signIn("maria@email.com", "12345678")).toEqual({ ok: false, error: "E-mail ou senha incorretos." })
  })
})
