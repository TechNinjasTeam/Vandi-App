import type { Account, Result } from "@/types"
import { clearAll, read, readSession, seed, writeSession } from "./storage"

export type InitialPath = "/sign-in" | "/operator" | "/student/my-route" | "/student/vans"

export async function getCurrentAccount(): Promise<Account | null> {
  const id = readSession()
  return read("accounts").find((a) => a.id === id) ?? null
}

export async function getInitialPath(): Promise<InitialPath> {
  const account = await getCurrentAccount()
  if (!account) return "/sign-in"
  if (account.role === "operator") return "/operator"
  const hasRoute =
    read("enrollments").some((e) => e.studentId === account.id && e.status !== "declined") ||
    read("singleTripBookings").some((b) => b.studentId === account.id && b.status !== "cancelled")
  return hasRoute ? "/student/my-route" : "/student/vans"
}

export async function signOut(): Promise<Result<null>> {
  writeSession(null)
  return { ok: true, data: null }
}

/** clearAll + seed(today). Error: "Não foi possível restaurar os dados. Tente de novo." */
export async function restoreDemoData(today: string): Promise<Result<null>> {
  if (!clearAll()) return { ok: false, error: "Não foi possível restaurar os dados. Tente de novo." }
  seed(today)
  return { ok: true, data: null }
}
