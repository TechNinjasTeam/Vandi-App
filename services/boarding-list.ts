import type { BoardingList, TripDirection } from "@/types"

// Stub of the contract: D2 fills it. Typed const without params keeps lint quiet until then.

/** null when the route is missing or not the operator's. Date = getNextOutboundDate. */
export const getBoardingList: (
  operatorId: string, routeId: string, leg: TripDirection, now: string,
) => Promise<BoardingList | null> = async () => {
  throw new Error("not implemented")
}
