import type { Enrollment, MyEnrollment, MyRoute, Result } from "@/types"
import { occupiedSeats, uniqueId } from "./routes"
import { read, write } from "./storage"

export async function countPendingRequests(operatorId: string): Promise<number> {
  const routeIds = read("routes").filter((r) => r.operatorId === operatorId).map((r) => r.id)
  return read("enrollments").filter((e) => e.status === "requested" && routeIds.includes(e.routeId)).length
}

/** Writes a "requested" enrollment with requestedAt = now. Errors in spec order, nothing written. */
export async function requestSeat(
  studentId: string, routeId: string, boardingPointId: string, now: string,
): Promise<Result<Enrollment>> {
  const fail = (error: string) => ({ ok: false, error }) as const
  const enrollments = read("enrollments")
  if (read("accounts").find((a) => a.id === studentId)?.role !== "student") return fail("Só aluno pode pedir vaga.")
  const route = read("routes").find((r) => r.id === routeId)
  if (!route) return fail("Essa van não existe mais.")
  if (!read("boardingPoints").some((p) => p.id === boardingPointId && p.routeId === routeId)) return fail("Escolha um ponto desta van.")
  const mine = enrollments.filter((e) => e.studentId === studentId)
  if (mine.some((e) => e.status === "confirmed")) return fail("Você já tem vaga fixa.")
  if (mine.some((e) => e.routeId === routeId && (e.status === "requested" || e.status === "accepted"))) return fail("Você já pediu vaga nesta van.")
  if ((await occupiedSeats(routeId)) >= route.seats) return fail("Essa van está lotada.")

  const enrollment: Enrollment = {
    id: uniqueId(`enr-${studentId.replace("st-", "")}-${routeId.replace("route-", "")}`, new Set(enrollments.map((e) => e.id))),
    routeId, studentId, boardingPointId, status: "requested", requestedAt: now,
  }
  write("enrollments", [...enrollments, enrollment])
  return { ok: true, data: enrollment }
}

export async function getMyRoute(studentId: string): Promise<MyRoute | null> {
  const mine = read("enrollments").filter((e) => e.studentId === studentId && e.status !== "cancelled")
  const routes = read("routes")
  const accounts = read("accounts")
  const points = read("boardingPoints")
  const detail = (e: Enrollment): MyEnrollment => {
    const route = routes.find((r) => r.id === e.routeId)!
    const operator = accounts.find((a) => a.id === route.operatorId)
    return {
      ...e,
      route,
      operatorName: operator?.name ?? "",
      operatorPhone: operator?.phone ?? "",
      boardingPoint: points.find((p) => p.id === e.boardingPointId)!,
    }
  }
  const confirmed = mine.find((e) => e.status === "confirmed")
  if (confirmed) return { kind: "confirmed", enrollment: detail(confirmed) }
  if (mine.length === 0) return null
  const newestFirst = [...mine].sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt))
  return { kind: "requests", enrollments: newestFirst.map(detail) }
}

const NOT_FOUND = "Pedido não encontrado."

/** accepted → confirmed; every other requested/accepted of the student → cancelled. */
export async function confirmSeat(studentId: string, enrollmentId: string): Promise<Result<Enrollment>> {
  const enrollments = read("enrollments")
  const target = enrollments.find((e) => e.id === enrollmentId && e.studentId === studentId)
  if (!target) return { ok: false, error: NOT_FOUND }
  if (target.status !== "accepted") return { ok: false, error: "Só dá pra ficar com uma van que aceitou seu pedido." }
  const confirmed: Enrollment = { ...target, status: "confirmed" }
  write("enrollments", enrollments.map((e) => {
    if (e.id === enrollmentId) return confirmed
    return e.studentId === studentId && (e.status === "requested" || e.status === "accepted") ? { ...e, status: "cancelled" as const } : e
  }))
  return { ok: true, data: confirmed }
}

/** requested/accepted → cancelled. */
export async function withdrawRequest(studentId: string, enrollmentId: string): Promise<Result<Enrollment>> {
  const enrollments = read("enrollments")
  const target = enrollments.find((e) => e.id === enrollmentId && e.studentId === studentId)
  if (!target) return { ok: false, error: NOT_FOUND }
  if (target.status !== "requested" && target.status !== "accepted") return { ok: false, error: "Não dá pra desistir desse pedido." }
  const cancelled: Enrollment = { ...target, status: "cancelled" }
  write("enrollments", enrollments.map((e) => (e.id === enrollmentId ? cancelled : e)))
  return { ok: true, data: cancelled }
}
