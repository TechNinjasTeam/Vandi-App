import type { BoardingPoint, NewRouteFieldErrors, NewRouteInput, NewRouteResult, OperatorRoute, Route, Weekday } from "@/types"
import { WEEKDAYS } from "./clock"
import { slugOf } from "./session"
import { read, write } from "./storage"

// Error copy verbatim from DEC-050.
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const PRICE = /^(?:R\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:[,.](\d{1,2}))?$/

/** Enrollments with status "accepted" on the route (DEC-048). The only seat count in the app. */
export async function occupiedSeats(routeId: string): Promise<number> {
  return read("enrollments").filter((e) => e.routeId === routeId && e.status === "accepted").length
}

/** Only the operator's routes, in storage order, each with its points sorted by `order` and occupiedSeats. [] when none. */
export async function listOperatorRoutes(operatorId: string): Promise<OperatorRoute[]> {
  const points = read("boardingPoints")
  return Promise.all(
    read("routes")
      .filter((r) => r.operatorId === operatorId)
      .map(async (route) => ({
        ...route,
        boardingPoints: points.filter((p) => p.routeId === route.id).sort((a, b) => a.order - b.order),
        occupiedSeats: await occupiedSeats(route.id),
      })),
  )
}

/** Price as typed ("350", "R$ 350,5", "1.200,00") to cents; NaN when it is not a price. */
function parseCents(text: string): number {
  const match = PRICE.exec(text.trim())
  if (!match) return NaN
  return Number(match[1].replaceAll(".", "")) * 100 + Number((match[2] ?? "").padEnd(2, "0"))
}

/** `base`, else `base-2`, `base-3`… the first not in `taken`. */
function uniqueId(base: string, taken: Set<string>): string {
  let id = base
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
  return id
}

/** Validates (DEC-050), writes the route and its points, returns the route. Nothing written on error. */
export async function createRoute(operatorId: string, input: NewRouteInput): Promise<NewRouteResult> {
  const origin = input.origin.trim()
  const seats = input.seats.trim()
  const cents = parseCents(input.monthlyPrice)
  const outboundOk = TIME.test(input.outboundTime)

  const fieldErrors: NewRouteFieldErrors = {}
  if (!origin) fieldErrors.origin = "Digite a cidade de onde a van sai."
  if (input.weekdays.length === 0) fieldErrors.weekdays = "Escolha pelo menos um dia."
  if (!outboundOk) fieldErrors.outboundTime = "Escolha o horário de ida."
  if (!TIME.test(input.returnTime)) fieldErrors.returnTime = "Escolha o horário de volta."
  else if (outboundOk && input.returnTime <= input.outboundTime) fieldErrors.returnTime = "A volta tem que ser depois da ida."
  if (!/^\d+$/.test(seats) || Number(seats) < 1) fieldErrors.seats = "Informe quantos lugares a van tem, de 1 em diante."
  if (!(cents > 0)) fieldErrors.monthlyPrice = "Informe a mensalidade, maior que zero."
  if (input.boardingPoints.length === 0) fieldErrors.boardingPoints = "Adicione pelo menos um ponto de embarque."
  else {
    const rows = input.boardingPoints.map((p) => ({
      ...(p.name.trim() ? {} : { name: "Digite o nome do ponto." }),
      ...(TIME.test(p.time) ? {} : { time: "Escolha o horário do ponto." }),
    }))
    if (rows.some((r) => r.name || r.time)) fieldErrors.boardingPointRows = rows
  }

  const [first] = Object.values(fieldErrors)
  if (first) {
    const error = typeof first === "string" ? first : (first.flatMap((r) => [r.name, r.time]).find(Boolean) as string)
    return { ok: false, error, fieldErrors }
  }

  const routes = read("routes")
  const id = uniqueId(`route-${slugOf(origin)}`, new Set(routes.map((r) => r.id)))
  const route: Route = {
    id,
    operatorId,
    origin,
    destination: "Facens",
    weekdays: WEEKDAYS.filter((d) => input.weekdays.includes(d)),
    outboundTime: input.outboundTime,
    returnTime: input.returnTime,
    seats: Number(seats),
    monthlyPrice: cents,
  }

  const existing = read("boardingPoints")
  const taken = new Set(existing.map((p) => p.id))
  const points: BoardingPoint[] = input.boardingPoints.map((p, i) => {
    const pointId = uniqueId(`bp-${id.replace("route-", "")}-${slugOf(p.name)}`, taken)
    taken.add(pointId)
    return { id: pointId, routeId: id, name: p.name.trim(), time: p.time, order: i + 1 }
  })

  write("routes", [...routes, route])
  write("boardingPoints", [...existing, ...points])
  return { ok: true, data: route }
}

const DAY_LABELS: Record<Weekday, string> = { mon: "seg", tue: "ter", wed: "qua", thu: "qui", fri: "sex", sat: "sáb" }

/** "seg a sex" when the days are contiguous, else "seg, qua, sex" (DEC-051). */
export function formatWeekdays(weekdays: Weekday[]): string {
  const days = WEEKDAYS.filter((d) => weekdays.includes(d))
  const labels = days.map((d) => DAY_LABELS[d])
  const contiguous = WEEKDAYS.indexOf(days[days.length - 1]) - WEEKDAYS.indexOf(days[0]) === days.length - 1
  return days.length > 1 && contiguous ? `${labels[0]} a ${labels[labels.length - 1]}` : labels.join(", ")
}
