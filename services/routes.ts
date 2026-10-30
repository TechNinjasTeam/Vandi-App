import type {
  BoardingPoint, EditableRoute, NewRouteFieldErrors, NewRouteInput, NewRouteResult, OperatorRoute, Route, Weekday,
} from "@/types"
import { WEEKDAYS } from "./clock"
import { slugOf } from "./session"
import { read, write } from "./storage"

// Error copy verbatim from DEC-050.
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
export const POINT_IN_USE = "Tem aluno embarcando nesse ponto"
const PRICE = /^(?:R\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:[,.](\d{1,2}))?$/

/** Enrollments with status "accepted" or "confirmed" on the route (DEC-058). The only seat count in the app. */
export async function occupiedSeats(routeId: string): Promise<number> {
  return read("enrollments").filter((e) => e.routeId === routeId && (e.status === "accepted" || e.status === "confirmed")).length
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
export function uniqueId(base: string, taken: Set<string>): string {
  let id = base
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
  return id
}

/** DEC-050 messages by field; `{}` when valid. `occupied` and `pointInUseRemoved` only on Editar rota (DEC-064). */
function validate(input: NewRouteInput, occupied = 0, pointInUseRemoved = false): NewRouteFieldErrors {
  const seats = input.seats.trim()
  const outboundOk = TIME.test(input.outboundTime)

  const fieldErrors: NewRouteFieldErrors = {}
  if (!input.origin.trim()) fieldErrors.origin = "Digite a cidade de onde a van sai."
  if (input.weekdays.length === 0) fieldErrors.weekdays = "Escolha pelo menos um dia."
  if (!outboundOk) fieldErrors.outboundTime = "Escolha o horário de ida."
  if (!TIME.test(input.returnTime)) fieldErrors.returnTime = "Escolha o horário de volta."
  else if (outboundOk && input.returnTime <= input.outboundTime) fieldErrors.returnTime = "A volta tem que ser depois da ida."
  if (!/^\d+$/.test(seats) || Number(seats) < 1) fieldErrors.seats = "Informe quantos lugares a van tem, de 1 em diante."
  else if (Number(seats) < occupied) fieldErrors.seats = `Já tem ${occupied} alunos na rota`
  if (!(parseCents(input.monthlyPrice) > 0)) fieldErrors.monthlyPrice = "Informe a mensalidade, maior que zero."
  if (input.boardingPoints.length === 0) fieldErrors.boardingPoints = "Adicione pelo menos um ponto de embarque."
  else {
    if (pointInUseRemoved) fieldErrors.boardingPoints = POINT_IN_USE
    const rows = input.boardingPoints.map((p) => ({
      ...(p.name.trim() ? {} : { name: "Digite o nome do ponto." }),
      ...(TIME.test(p.time) ? {} : { time: "Escolha o horário do ponto." }),
    }))
    if (rows.some((r) => r.name || r.time)) fieldErrors.boardingPointRows = rows
  }
  return fieldErrors
}

/** The failure for the first message in form order, or null when there is none. */
function firstError(fieldErrors: NewRouteFieldErrors): NewRouteResult | null {
  const [first] = Object.values(fieldErrors)
  if (!first) return null
  const error = typeof first === "string" ? first : (first.flatMap((r) => [r.name, r.time]).find(Boolean) as string)
  return { ok: false, error, fieldErrors }
}

function buildRoute(id: string, operatorId: string, input: NewRouteInput): Route {
  return {
    id,
    operatorId,
    origin: input.origin.trim(),
    destination: "Facens",
    weekdays: WEEKDAYS.filter((d) => input.weekdays.includes(d)),
    outboundTime: input.outboundTime,
    returnTime: input.returnTime,
    seats: Number(input.seats.trim()),
    monthlyPrice: parseCents(input.monthlyPrice),
  }
}

/** Points in van order. A point whose input id is in `kept` keeps it (once); the others get a new id not in `taken`. */
function buildPoints(routeId: string, input: NewRouteInput, kept: Set<string>, taken: Set<string>): BoardingPoint[] {
  return input.boardingPoints.map((p, i) => {
    let id = p.id ?? ""
    if (!kept.delete(id)) {
      id = uniqueId(`bp-${routeId.replace("route-", "")}-${slugOf(p.name)}`, taken)
      taken.add(id)
    }
    return { id, routeId, name: p.name.trim(), time: p.time, order: i + 1 }
  })
}

/** Validates (DEC-050), writes the route and its points, returns the route. Nothing written on error. */
export async function createRoute(operatorId: string, input: NewRouteInput): Promise<NewRouteResult> {
  const invalid = firstError(validate(input))
  if (invalid) return invalid

  const routes = read("routes")
  const id = uniqueId(`route-${slugOf(input.origin.trim())}`, new Set(routes.map((r) => r.id)))
  const route = buildRoute(id, operatorId, input)

  const existing = read("boardingPoints")
  const points = buildPoints(id, input, new Set(), new Set(existing.map((p) => p.id)))

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

/** Ids of the route's points with a requested, accepted or confirmed enrollment. */
function pointsInUseOf(routeId: string): string[] {
  const active = ["requested", "accepted", "confirmed"]
  return [...new Set(read("enrollments").filter((e) => e.routeId === routeId && active.includes(e.status)).map((e) => e.boardingPointId))]
}

/** null when the route does not exist or is another operator's. */
export async function getOperatorRoute(operatorId: string, routeId: string): Promise<EditableRoute | null> {
  const route = (await listOperatorRoutes(operatorId)).find((r) => r.id === routeId)
  return route ? { ...route, pointsInUse: pointsInUseOf(routeId) } : null
}

/** Same validation as createRoute (DEC-050) plus DEC-064; keeps the route id and the ids of points that stay. */
export async function updateRoute(operatorId: string, routeId: string, input: NewRouteInput): Promise<NewRouteResult> {
  const routes = read("routes")
  if (!routes.some((r) => r.id === routeId && r.operatorId === operatorId)) return { ok: false, error: "Rota não encontrada." }

  const existing = read("boardingPoints")
  const own = new Set(existing.filter((p) => p.routeId === routeId).map((p) => p.id))
  const removedInUse = pointsInUseOf(routeId).some((id) => !input.boardingPoints.some((p) => p.id === id))
  const invalid = firstError(validate(input, await occupiedSeats(routeId), removedInUse))
  if (invalid) return invalid

  const route = buildRoute(routeId, operatorId, input)
  const points = buildPoints(routeId, input, own, new Set(existing.map((p) => p.id)))

  write("routes", routes.map((r) => (r.id === routeId ? route : r)))
  write("boardingPoints", [...existing.filter((p) => p.routeId !== routeId), ...points])
  return { ok: true, data: route }
}

/** "R$ 380" for 38000, "R$ 350,50", "R$ 1.200". */
export function formatMonthlyPrice(cents: number): string {
  const reais = Math.floor(cents / 100).toLocaleString("pt-BR")
  const rest = cents % 100
  return `R$ ${reais}${rest ? `,${String(rest).padStart(2, "0")}` : ""}`
}
