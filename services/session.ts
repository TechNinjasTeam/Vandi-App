import type { Account, Result } from "@/types"

export type InitialPath = "/sign-in" | "/operator" | "/student/my-route" | "/student/vans"

export async function getCurrentAccount(): Promise<Account | null> {
  throw new Error("not implemented")
}

export async function getInitialPath(): Promise<InitialPath> {
  throw new Error("not implemented")
}

export async function signOut(): Promise<Result<null>> {
  throw new Error("not implemented")
}

/** clearAll + seed(today). Error: "Não foi possível restaurar os dados. Tente de novo." */
export async function restoreDemoData(today: string): Promise<Result<null>> {
  throw new Error("not implemented")
}
