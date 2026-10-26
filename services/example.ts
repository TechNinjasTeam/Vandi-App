import type { Route } from "@/types"
import { read } from "./storage"

export type ExampleSimulation = "empty" | "error"

/** "error" rejects with new Error("Não foi possível carregar as rotas."). */
export async function listExampleRoutes(simulate?: ExampleSimulation): Promise<Route[]> {
  if (simulate === "error") throw new Error("Não foi possível carregar as rotas.")
  return simulate === "empty" ? [] : read("routes")
}
