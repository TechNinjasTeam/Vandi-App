import type { Enrollment, EnrollmentStatus, Result, RouteRequests } from "@/types"
import { listOperatorRoutes, occupiedSeats } from "./routes"
import { read, write } from "./storage"

/** One item per operator route (storage order, listOperatorRoutes); [] without routes. */
export async function listRequests(operatorId: string): Promise<RouteRequests[]> {
  const enrollments = read("enrollments")
  const accounts = read("accounts")
  return (await listOperatorRoutes(operatorId)).map((route) => {
    const byAge = (status: EnrollmentStatus) =>
      enrollments
        .filter((e) => e.routeId === route.id && e.status === status)
        .sort((a, b) => Date.parse(a.requestedAt) - Date.parse(b.requestedAt))
        .map((e) => {
          const student = accounts.find((a) => a.id === e.studentId)
          return {
            ...e,
            studentName: student?.name ?? "",
            studentPhone: student?.phone ?? "",
            boardingPoint: route.boardingPoints.find((p) => p.id === e.boardingPointId)!,
          }
        })
    return { route, requested: byAge("requested"), accepted: byAge("accepted") }
  })
}

/** The owner's enrollment still waiting for an answer; errors in the order of plano 1.4. */
function pending(operatorId: string, enrollmentId: string): Result<Enrollment> {
  const enrollments = read("enrollments")
  const enrollment = enrollments.find((e) => e.id === enrollmentId)
  const route = enrollment && read("routes").find((r) => r.id === enrollment.routeId)
  if (!enrollment || route?.operatorId !== operatorId) return { ok: false, error: "Pedido não encontrado." }
  if (enrollment.status === "cancelled" && enrollments.some((e) => e.studentId === enrollment.studentId && e.status === "confirmed")) {
    return { ok: false, error: "Esse aluno já ficou com outra van." }
  }
  if (enrollment.status !== "requested") return { ok: false, error: "Esse pedido não está mais esperando." }
  return { ok: true, data: enrollment }
}

function answer(enrollment: Enrollment, status: "accepted" | "declined"): Result<Enrollment> {
  const data = { ...enrollment, status }
  write("enrollments", read("enrollments").map((e) => (e.id === data.id ? data : e)))
  return { ok: true, data }
}

export async function acceptRequest(operatorId: string, enrollmentId: string): Promise<Result<Enrollment>> {
  const found = pending(operatorId, enrollmentId)
  if (!found.ok) return found
  const route = read("routes").find((r) => r.id === found.data.routeId)!
  if ((await occupiedSeats(route.id)) >= route.seats) {
    return { ok: false, error: "A van está lotada. Recuse o pedido ou libere um lugar." }
  }
  return answer(found.data, "accepted")
}

export async function declineRequest(operatorId: string, enrollmentId: string): Promise<Result<Enrollment>> {
  const found = pending(operatorId, enrollmentId)
  return found.ok ? answer(found.data, "declined") : found
}
