import type { Enrollment, MyRoute, Result } from "@/types"
import { read } from "./storage"

export async function countPendingRequests(operatorId: string): Promise<number> {
  const routeIds = read("routes").filter((r) => r.operatorId === operatorId).map((r) => r.id)
  return read("enrollments").filter((e) => e.status === "requested" && routeIds.includes(e.routeId)).length
}

/** Writes a "requested" enrollment with requestedAt = now. Errors in spec order, nothing written. */
export async function requestSeat(
  _studentId: string, _routeId: string, _boardingPointId: string, _now: string,
): Promise<Result<Enrollment>> {
  throw new Error("not implemented")
}

export async function getMyRoute(_studentId: string): Promise<MyRoute | null> {
  throw new Error("not implemented")
}

/** accepted → confirmed; every other requested/accepted of the student → cancelled. */
export async function confirmSeat(_studentId: string, _enrollmentId: string): Promise<Result<Enrollment>> {
  throw new Error("not implemented")
}

/** requested/accepted → cancelled. */
export async function withdrawRequest(_studentId: string, _enrollmentId: string): Promise<Result<Enrollment>> {
  throw new Error("not implemented")
}
