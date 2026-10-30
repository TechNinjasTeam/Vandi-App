import type { MySingleTrip, Result, SingleTripBooking, SingleTripCard, SingleTripOffer } from "@/types"

// Stubs of the contract: D3 fills them. Typed consts without params keep lint quiet until then.

/** Sets offer.seats = sold + quantity for the next outbound (one offer per route + date). */
export const announceSeats: (
  operatorId: string, routeId: string, quantity: number, now: string,
) => Promise<Result<SingleTripOffer>> = async () => {
  throw new Error("not implemented")
}

/** Routes from searchVans(origin) whose next outbound has onSale > 0; storage order. */
export const listSingleTrips: (origin: string, now: string) => Promise<SingleTripCard[]> = async () => {
  throw new Error("not implemented")
}

/** Writes a "pending" booking: price/vandiFee from pricing.ts on the offer date's month, operatorShare = price − vandiFee, creditUsed 0, createdAt = now. */
export const bookSingleTrip: (
  studentId: string, offerId: string, boardingPointId: string, now: string,
) => Promise<Result<SingleTripBooking>> = async () => {
  throw new Error("not implemented")
}

/** pending → paid (Pix simulado). */
export const payBooking: (studentId: string, bookingId: string) => Promise<Result<SingleTripBooking>> = async () => {
  throw new Error("not implemented")
}

/** pending | paid → cancelled, until 20:00 of the eve. */
export const cancelBooking: (
  studentId: string, bookingId: string, now: string,
) => Promise<Result<SingleTripBooking>> = async () => {
  throw new Error("not implemented")
}

/** The student's bookings whose departure is after now, any status, newest createdAt first. */
export const getMySingleTrips: (studentId: string, now: string) => Promise<MySingleTrip[]> = async () => {
  throw new Error("not implemented")
}
