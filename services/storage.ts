import type {
  Absence, Account, BoardingPoint, Enrollment, MonthlyFee, PushSubscription, ReturnCall,
  ReturnCallResponse, Route, SingleTripBooking, SingleTripOffer, Trip,
} from "@/types"

// The only file that touches localStorage. Sync on purpose: services wrap it.
export type Store = {
  accounts: Account[]; routes: Route[]; boardingPoints: BoardingPoint[]; enrollments: Enrollment[]
  trips: Trip[]; absences: Absence[]; returnCalls: ReturnCall[]; returnCallResponses: ReturnCallResponse[]
  singleTripOffers: SingleTripOffer[]; singleTripBookings: SingleTripBooking[]
  monthlyFees: MonthlyFee[]; pushSubscriptions: PushSubscription[]
}
export type Subject = keyof Store // key: `vandi:v1:${subject}`

/** Resolves mocks on `today`, writes every subject with nothing stored. */
export function seed(today: string): void {
  throw new Error("not implemented")
}

/** Nothing stored: seed(getToday()) first. */
export function read<S extends Subject>(subject: S): Store[S] {
  throw new Error("not implemented")
}

export function write<S extends Subject>(subject: S, data: Store[S]): void {
  throw new Error("not implemented")
}

/** Account id. */
export function readSession(): string | null {
  throw new Error("not implemented")
}

/** null removes the key. */
export function writeSession(accountId: string | null): void {
  throw new Error("not implemented")
}

/** false when localStorage threw while removing. */
export function clearAll(): boolean {
  throw new Error("not implemented")
}
