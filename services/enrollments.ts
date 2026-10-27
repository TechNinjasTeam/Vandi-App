import { read } from "./storage"

export async function countPendingRequests(operatorId: string): Promise<number> {
  const routeIds = read("routes").filter((r) => r.operatorId === operatorId).map((r) => r.id)
  return read("enrollments").filter((e) => e.status === "requested" && routeIds.includes(e.routeId)).length
}
