import type { Route, VanDetail, VanListing } from "@/types"
import { occupiedSeats } from "./routes"
import { read } from "./storage"

const normalize = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim()

async function toListing(route: Route): Promise<VanListing> {
  const freeSeats = Math.max(0, route.seats - (await occupiedSeats(route.id)))
  const operator = read("accounts").find((a) => a.id === route.operatorId)
  return {
    ...route,
    operatorName: operator?.name ?? "",
    operatorPhone: operator?.phone ?? "",
    boardingPoints: read("boardingPoints").filter((p) => p.routeId === route.id).sort((a, b) => a.order - b.order),
    freeSeats,
    full: freeSeats === 0,
  }
}

/** Every route when `city` is blank; else routes whose origin starts with `city`, ignoring accents, case and outer spaces. Storage order. */
export async function searchVans(city: string): Promise<VanListing[]> {
  const prefix = normalize(city)
  return Promise.all(read("routes").filter((r) => normalize(r.origin).startsWith(prefix)).map(toListing))
}

/** null when the route does not exist. */
export async function getVan(routeId: string, studentId: string): Promise<VanDetail | null> {
  const route = read("routes").find((r) => r.id === routeId)
  if (!route) return null
  const mine = read("enrollments").filter((e) => e.studentId === studentId)
  return {
    ...(await toListing(route)),
    hasConfirmedSeat: mine.some((e) => e.status === "confirmed"),
    hasActiveRequest: mine.some((e) => e.routeId === routeId && (e.status === "requested" || e.status === "accepted")),
  }
}
