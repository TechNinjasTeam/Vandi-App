import type { Enrollment, Result, RouteRequests } from "@/types"

/** One item per operator route (storage order, listOperatorRoutes); [] without routes. */
export async function listRequests(_operatorId: string): Promise<RouteRequests[]> {
  throw new Error("not implemented")
}

export async function acceptRequest(_operatorId: string, _enrollmentId: string): Promise<Result<Enrollment>> {
  throw new Error("not implemented")
}

export async function declineRequest(_operatorId: string, _enrollmentId: string): Promise<Result<Enrollment>> {
  throw new Error("not implemented")
}
