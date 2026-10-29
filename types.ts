// Contract of the app. Money in cents (integer). Dates "YYYY-MM-DD", times "HH:mm",
// instants ISO 8601. Status values in snake_case.

export type Result<T> = { ok: true; data: T } | { ok: false; error: string }

type AccountFields = { id: string; name: string; email: string; password: string; phone: string }
export type Operator = AccountFields & { role: "operator" }
export type Student = AccountFields & { role: "student" }
export type Account = Operator | Student
export type Role = Account["role"]

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat"
export type EnrollmentStatus = "requested" | "accepted" | "confirmed" | "declined" | "cancelled" // DEC-057
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

/** Create-route form as typed (DEC-050). Destination is always "Facens": not in the form. */
export type NewRouteInput = {
  origin: string
  weekdays: Weekday[]
  outboundTime: string; returnTime: string      // "HH:mm", or "" when empty (from the time picker)
  seats: string                                 // as typed: "15"
  monthlyPrice: string                          // as typed: "350", "350,00", "R$ 350,00"
  boardingPoints: { id?: string; name: string; time: string }[] // in van order; id only on Editar rota, for a point that stays
}
/** Message of each invalid new-route field. `boardingPoints`: no point at all (no field: Alert above the button). */
export type NewRouteFieldErrors = Partial<
  Record<"origin" | "weekdays" | "outboundTime" | "returnTime" | "seats" | "monthlyPrice" | "boardingPoints", string>
> & {
  /** Same index as NewRouteInput.boardingPoints, `{}` for a valid row. Only when some row is invalid. */
  boardingPointRows?: { name?: string; time?: string }[]
}
/** Result<Route> plus the message of each invalid field (`error` repeats the first, in form order). */
export type NewRouteResult =
  | { ok: true; data: Route }
  | { ok: false; error: string; fieldErrors?: NewRouteFieldErrors }
/** Computed, never stored: an operator's route with its points (by `order`) and occupied seats (DEC-058). */
export type OperatorRoute = Route & { boardingPoints: BoardingPoint[]; occupiedSeats: number }

/** Computed, never stored: a route as the student sees it on Tela 6 and Tela 7. */
export type VanListing = Route & {
  operatorName: string; operatorPhone: string
  boardingPoints: BoardingPoint[]               // by `order`
  freeSeats: number                             // seats - occupiedSeats, never below 0
  full: boolean                                 // freeSeats === 0
}
/** Computed: Tela 7 with what the student already has. */
export type VanDetail = VanListing & {
  hasConfirmedSeat: boolean                     // "confirmed" on any route
  hasActiveRequest: boolean                     // "requested" or "accepted" on this route
}
/** Computed: one of the student's enrollments as Minha rota shows it. */
export type MyEnrollment = Enrollment & {
  route: Route; operatorName: string; operatorPhone: string; boardingPoint: BoardingPoint
}
/** Computed: Tela 8. getMyRoute returns null when there is nothing to list (empty state). */
export type MyRoute =
  | { kind: "confirmed"; enrollment: MyEnrollment }
  | { kind: "requests"; enrollments: MyEnrollment[] } // requested, accepted, declined; newest first
/** Computed: one enrollment as the operator sees it on Tela 5. */
export type SeatRequest = Enrollment & { studentName: string; studentPhone: string; boardingPoint: BoardingPoint }
/** Computed: Tela 5 for one route of the operator. */
export type RouteRequests = {
  route: OperatorRoute
  requested: SeatRequest[]                      // oldest first
  accepted: SeatRequest[]                       // "Esperando o aluno confirmar", oldest first
}
/** Computed: Editar rota. pointsInUse: ids of points with a requested, accepted or confirmed enrollment. */
export type EditableRoute = OperatorRoute & { pointsInUse: string[] }

/** Dashboard tab: "all" ("Todas") or a routeId. */
export type RouteFilter = "all" | string
/** What metrics.ts reads. `routes` = the operator's routes; the other lists may hold any route (filtered by routeId inside). */
export type MetricsInput = {
  routes: Route[]; enrollments: Enrollment[]; trips: Trip[]; absences: Absence[]
  singleTripOffers: SingleTripOffer[]; singleTripBookings: SingleTripBooking[]
}
/** Sum of the outbound trips of one Mon–Sat week, dates from `start` to `end`. Computed, never stored. */
export type WeekMetrics = {
  start: string; end: string                    // Monday; last day counted (today in the current week, else Saturday)
  tripCount: number                             // outbound trips counted; 0 = no data ("—")
  seats: number                                 // Σ route.seats
  fixed: number                                 // Σ accepted − absences ("fixos que vão")
  sold: number                                  // Σ paid bookings ("vendidos" = "avulsos")
  occupied: number                              // fixed + sold
  rate: number | null                           // occupied / seats, 0..1; null when tripCount is 0
  leftover: number                              // seats − fixed ("sobraram")
  empty: number                                 // leftover − sold, never below 0 ("vazios")
  earnings: number                              // cents: Σ operatorShare of paid bookings
}
export type Trend = "better" | "worse" | "same"
/** One per card. null = no comparison (badge hidden). */
export type WeekComparison = { occupancy: Trend | null; leftover: Trend | null; earnings: Trend | null }
/** One bar of "Lugares ocupados por semana". fixed + singles + empty = seats of the week. */
export type WeeklyPoint = { weekStart: string; tripCount: number; fixed: number; singles: number; empty: number }
/** Absences per 100 accepted students on that weekday, 8-week average. null = no filtered trip that day. */
export type WeekdayAbsence = { weekday: Exclude<Weekday, "sat">; percent: number | null }
/** Everything Tela 12 draws. Computed, never stored. */
export type Dashboard =
  | { status: "empty"; week: { start: string; end: string } }
  | {
      status: "ready"
      week: { start: string; end: string }        // = current.start / current.end
      filter: RouteFilter                         // echo; unknown routeId → "all"
      routes: { id: string; label: string }[]    // operator's routes, storage order; label = origin
      current: WeekMetrics
      previous: WeekMetrics
      comparison: WeekComparison
      weeks: WeeklyPoint[]                        // 8, oldest first; the last is the current week
      absences: WeekdayAbsence[]                  // mon, tue, wed, thu, fri
      peakWeekday: Exclude<Weekday, "sat"> | null // null when every day is null or the max is tied
    }
