import type { Account, EnrollmentStatus, Result, Role, SignUpFieldErrors, SignUpResult } from "@/types"
import { clearAll, read, readSession, seed, write, writeSession } from "./storage"

export type InitialPath = "/sign-in" | "/operator" | "/student/my-route" | "/student/vans"

export async function getCurrentAccount(): Promise<Account | null> {
  const id = readSession()
  return read("accounts").find((a) => a.id === id) ?? null
}

const ACTIVE: EnrollmentStatus[] = ["requested", "accepted", "confirmed"]

export async function getInitialPath(): Promise<InitialPath> {
  const account = await getCurrentAccount()
  if (!account) return "/sign-in"
  if (account.role === "operator") return "/operator"
  const hasRoute =
    read("enrollments").some((e) => e.studentId === account.id && ACTIVE.includes(e.status)) ||
    read("singleTripBookings").some((b) => b.studentId === account.id && b.status !== "cancelled")
  return hasRoute ? "/student/my-route" : "/student/vans"
}

export type SignUpInput = { role: Role; name: string; phone: string; email: string; password: string }

/** Any failure: "E-mail ou senha incorretos." (DEC-040). Success writes the session. */
export async function signIn(email: string, password: string): Promise<Result<Account>> {
  const account = read("accounts").find((a) => a.email === normalizeEmail(email))
  // support accounts have password "": an empty one never enters
  if (!account || password === "" || account.password !== password) {
    return { ok: false, error: "E-mail ou senha incorretos." }
  }
  writeSession(account.id)
  return { ok: true, data: account }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

export const slugOf = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "account"

/** Validates (DEC-041), writes the account, opens the session (DEC-042). */
export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const accounts = read("accounts")
  const name = input.name.trim()
  const email = normalizeEmail(input.email)
  const digits = input.phone.replace(/\D/g, "")

  const fieldErrors: SignUpFieldErrors = {}
  if (!name) fieldErrors.name = "Digite seu nome."
  if (digits.length !== 10 && digits.length !== 11) fieldErrors.phone = "Coloque o DDD, ex.: 15 99999-0000"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Digite um e-mail válido, ex.: nome@email.com"
  else if (accounts.some((a) => a.email === email)) fieldErrors.email = "Esse e-mail já tem conta. Entre ou use outro e-mail."
  if (input.password.length < 8) fieldErrors.password = "A senha precisa ter pelo menos 8 caracteres."

  const first = Object.values(fieldErrors)[0]
  if (first) return { ok: false, error: first, fieldErrors }

  const prefix = input.role === "operator" ? "op" : "st"
  const base = `${prefix}-${slugOf(name)}`
  let id = base
  for (let n = 2; accounts.some((a) => a.id === id); n++) id = `${base}-${n}`

  const ddd = digits.slice(0, 2)
  const rest = digits.slice(2)
  const phone = `(${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`
  const account: Account = { id, name, email, password: input.password, role: input.role, phone }
  write("accounts", [...accounts, account])
  writeSession(id)
  return { ok: true, data: account }
}

export async function signOut(): Promise<Result<null>> {
  writeSession(null)
  return { ok: true, data: null }
}

/** clearAll + seed(now). Error: "Não foi possível restaurar os dados. Tente de novo." */
export async function restoreDemoData(now: string): Promise<Result<null>> {
  if (!clearAll()) return { ok: false, error: "Não foi possível restaurar os dados. Tente de novo." }
  seed(now)
  return { ok: true, data: null }
}
