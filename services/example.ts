import type { Route } from "@/types"

export type ExampleSimulation = "empty" | "error"

/** "error" rejects with new Error("Não foi possível carregar as rotas."). */
export async function listExampleRoutes(simulate?: ExampleSimulation): Promise<Route[]> {
  throw new Error("not implemented")
}
