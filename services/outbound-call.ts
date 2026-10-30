import type { OutboundCall, OutboundCallAnswer, OutboundCallResponse, Result } from "@/types"

// Stubs of the contract: D1 fills them. Typed consts without params keep lint quiet until then.

/** null without a confirmed enrollment or with an invalid outboundTime. Date = getNextOutboundDate. */
export const getOutboundCall: (studentId: string, now: string) => Promise<OutboundCall | null> = async () => {
  throw new Error("not implemented")
}

/** Upserts the row of (student, route, next outbound date), answeredAt = now; then fits the bookings. */
export const answerOutboundCall: (
  studentId: string, routeId: string, answer: OutboundCallAnswer, now: string,
) => Promise<Result<OutboundCallResponse>> = async () => {
  throw new Error("not implemented")
}

/** Writes "both" until −6 h; cancels the most recent active booking while a leg's leftover < 0. */
export const reclaimSeat: (
  studentId: string, routeId: string, now: string,
) => Promise<Result<{ cancelledBookings: number }>> = async () => {
  throw new Error("not implemented")
}

/** Σ legCredit of the student's released legs matched to paid bookings (cents). */
export const getCredit: (studentId: string) => Promise<number> = async () => {
  throw new Error("not implemented")
}
