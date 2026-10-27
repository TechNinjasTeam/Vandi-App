import type { NewRouteInput, NewRouteResult, OperatorRoute, Weekday } from "@/types"

// Contract stubs: the data sub-issue (#4 S1) implements them. Copy of the errors (verbatim, DEC-050):
// origin "Digite a cidade de onde a van sai." · weekdays "Escolha pelo menos um dia."
// outboundTime "Escolha o horário de ida." · returnTime "Escolha o horário de volta." / "A volta tem que ser depois da ida."
// seats "Informe quantos lugares a van tem, de 1 em diante." · monthlyPrice "Informe a mensalidade, maior que zero."
// boardingPoints "Adicione pelo menos um ponto de embarque." · rows "Digite o nome do ponto." / "Escolha o horário do ponto."

/** Enrollments with status "accepted" on the route (DEC-048). The only seat count in the app. */
export async function occupiedSeats(routeId: string): Promise<number> {
  void routeId
  throw new Error("not implemented")
}

/** Only the operator's routes, in storage order, each with its points sorted by `order` and occupiedSeats. [] when none. */
export async function listOperatorRoutes(operatorId: string): Promise<OperatorRoute[]> {
  void operatorId
  throw new Error("not implemented")
}

/** Validates (DEC-050), writes the route and its points, returns the route. Nothing written on error. */
export async function createRoute(operatorId: string, input: NewRouteInput): Promise<NewRouteResult> {
  void operatorId
  void input
  throw new Error("not implemented")
}

/** "seg a sex" when the days are contiguous, else "seg, qua, sex" (DEC-051). */
export function formatWeekdays(weekdays: Weekday[]): string {
  void weekdays
  throw new Error("not implemented")
}
