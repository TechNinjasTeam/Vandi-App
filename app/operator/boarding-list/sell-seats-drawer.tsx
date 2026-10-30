import type { Route, SeatBalance } from "@/types"

// Stub of the contract: T3 fills it (Drawer "Vender lugares sobrando" na Tela 9).
export const SellSeatsDrawer: (props: {
  operatorId: string; route: Route; balance: SeatBalance; onAnnounced: () => void
}) => React.ReactNode = () => null
