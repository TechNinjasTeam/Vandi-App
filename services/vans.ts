import type { VanDetail, VanListing } from "@/types"

/** Every route when `city` is blank; else routes whose origin starts with `city`, ignoring accents, case and outer spaces. Storage order. */
export async function searchVans(_city: string): Promise<VanListing[]> {
  throw new Error("not implemented")
}

/** null when the route does not exist. */
export async function getVan(_routeId: string, _studentId: string): Promise<VanDetail | null> {
  throw new Error("not implemented")
}
