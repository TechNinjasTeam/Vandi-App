// Contract of the app. Money in cents (integer). Dates "YYYY-MM-DD", times "HH:mm",
// instants ISO 8601. Status values in snake_case.

export type Result<T> = { ok: true; data: T } | { ok: false; error: string }

type AccountFields = { id: string; name: string; email: string; password: string; phone: string }
export type Operator = AccountFields & { role: "operator" }
export type Student = AccountFields & { role: "student" }
export type Account = Operator | Student
export type Role = Account["role"]

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat"
export type EnrollmentStatus = "requested" | "accepted" | "declined"
export type TripDirection = "outbound" | "return"
export type ReturnStatus = "returning" | "not_returning" | "no_response" // no_response is never stored
export type PaymentStatus = "pending" | "paid" | "cancelled"

export type Route = {
  id: string; operatorId: string
  origin: string; destination: string           // "Itu", "Facens"
  weekdays: Weekday[]
  outboundTime: string; returnTime: string      // "17:50", "22:50"
  seats: number
  monthlyPrice: number                          // cents: 38000
}
export type BoardingPoint = { id: string; routeId: string; name: string; time: string; order: number }
export type Enrollment = {
  id: string; routeId: string; studentId: string; boardingPointId: string
  status: EnrollmentStatus; requestedAt: string
}
export type Trip = { id: string; routeId: string; date: string; direction: TripDirection }
export type Absence = { id: string; studentId: string; routeId: string; date: string; reportedAt: string } // reportedAt orders the sale (DEC-034)
export type ReturnCall = {
  id: string; routeId: string; date: string
  deadline: string; meetingPoint: string        // "22:40", "Estacionamento da Facens, portão 2"
  openedAt: string; closedAt: string | null
}
export type ReturnCallResponse = {
  id: string; returnCallId: string; studentId: string
  status: Exclude<ReturnStatus, "no_response">; answeredAt: string
}
export type SingleTripOffer = { id: string; routeId: string; date: string; seats: number; createdAt: string }
export type SingleTripBooking = {
  id: string; offerId: string; studentId: string; boardingPointId: string
  absenceId: string | null                      // null = seat with no owner (DEC-036)
  price: number; vandiFee: number; operatorShare: number
  creditAmount: number                          // 0 for a seat with no owner
  creditUsed: number
  status: PaymentStatus; createdAt: string
}
export type MonthlyFee = {
  id: string; enrollmentId: string; month: string // "YYYY-MM"
  amount: number; creditUsed: number; status: PaymentStatus
}
/** Computed, never stored (DEC-036): one per paid booking with absenceId. */
export type Credit = { studentId: string; bookingId: string; amount: number }
/** Same name as the browser's PushSubscription: importing it from "@/types" shadows the DOM type in that file. */
export type PushSubscription = { id: string; studentId: string; endpoint: string; createdAt: string }

/** Message of each invalid sign-up field, ready for the screen. */
export type SignUpFieldErrors = Partial<Record<"name" | "phone" | "email" | "password", string>>
/** Result<Account> plus, on a form error, the message of each invalid field (`error` repeats the first). */
export type SignUpResult =
  | { ok: true; data: Account }
  | { ok: false; error: string; fieldErrors?: SignUpFieldErrors }
