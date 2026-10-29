"use client"

// CAMADA 2 · HOOK da Tela 12 (Desempenho). Só guarda o estado e transforma número em texto com os format* do service.
// Nenhuma conta aqui: porcentagem, soma, comparação e dia de pico vêm prontos de getDashboard.
import { useEffect, useRef, useState } from "react"

import { getToday } from "@/services/clock"
import { formatMoney, formatPercent, formatShortDate, formatWeekCaption, getDashboard } from "@/services/dashboard"
import { getCurrentAccount } from "@/services/session"
import type { Dashboard, RouteFilter, Trend, WeekMetrics, WeeklyPoint } from "@/types"

const NO_DATA = "—"
const CURRENT_WEEK = 7

const SHORT_DAYS = { mon: "seg", tue: "ter", wed: "qua", thu: "qui", fri: "sex" }
const LONG_DAYS = { mon: "Segunda", tue: "Terça", wed: "Quarta", thu: "Quinta", fri: "Sexta" }

export type DashboardView = {
  caption: string
  tabs: { value: RouteFilter; label: string }[]
  occupancy: { occupied: string; seats: string; percent: string; trend: Trend | null; previous: string }
  leftover: { sold: string; leftover: string; empty: string; trend: Trend | null; previous: string; bar: { sold: number; empty: number } }
  earnings: { value: string; trend: Trend | null; previous: string }
  weeks: {
    label: string
    detailTitle: string
    fixed: string
    singles: string
    empty: string
    ariaLabel: string
    values: WeeklyPoint
  }[]
  absenceDays: { label: string; text: string; percent: number | null; peak: boolean }[]
  peakPhrase: string | null
  noData: boolean
}

export type DashboardState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty"; caption: string }
  | { status: "ready"; view: DashboardView }

// Semana sem viagem: todo número vira "—", nunca 0 nem NaN
function figure(week: WeekMetrics, value: number): string {
  return week.tripCount === 0 ? NO_DATA : String(value)
}

function buildView(data: Extract<Dashboard, { status: "ready" }>): DashboardView {
  const { current, previous } = data
  const noData = current.tripCount === 0
  const hadPrevious = previous.tripCount > 0

  return {
    caption: formatWeekCaption(data.week.start, data.week.end),
    tabs: data.routes.length >= 2 ? [{ value: "all", label: "Todas" }, ...data.routes.map((r) => ({ value: r.id, label: r.label }))] : [],
    occupancy: {
      occupied: figure(current, current.occupied),
      seats: figure(current, current.seats),
      percent: formatPercent(current.rate),
      trend: data.comparison.occupancy,
      previous: hadPrevious
        ? `Semana passada: ${previous.occupied} de ${previous.seats} (${formatPercent(previous.rate)})`
        : `Semana passada: ${NO_DATA}`,
    },
    leftover: {
      sold: figure(current, current.sold),
      leftover: figure(current, current.leftover),
      empty: figure(current, current.empty),
      trend: data.comparison.leftover,
      previous: hadPrevious ? `Semana passada: ${previous.sold} de ${previous.leftover} vendidos` : `Semana passada: ${NO_DATA}`,
      bar: { sold: current.sold, empty: current.empty },
    },
    earnings: {
      value: noData ? NO_DATA : formatMoney(current.earnings),
      trend: data.comparison.earnings,
      previous: hadPrevious ? `Semana passada: ${formatMoney(previous.earnings)}` : `Semana passada: ${NO_DATA}`,
    },
    weeks: data.weeks.map((w) => {
      const label = formatShortDate(w.weekStart)
      const none = w.tripCount === 0
      const fixed = none ? NO_DATA : String(w.fixed)
      const singles = none ? NO_DATA : String(w.singles)
      const empty = none ? NO_DATA : String(w.empty)
      return {
        label,
        detailTitle: `Semana de ${label}`,
        fixed,
        singles,
        empty,
        ariaLabel: `Semana de ${label}: ${fixed} fixos, ${singles} avulsos, ${empty} vazios`,
        values: w,
      }
    }),
    absenceDays: data.absences.map((d) => ({
      label: SHORT_DAYS[d.weekday],
      text: d.percent === null ? "–" : String(d.percent),
      percent: d.percent,
      peak: d.weekday === data.peakWeekday,
    })),
    peakPhrase: data.peakWeekday ? `${LONG_DAYS[data.peakWeekday]} é o dia com mais faltas. Bom dia pra vender lugar avulso.` : null,
    noData,
  }
}

function load(filter: RouteFilter): Promise<DashboardState> {
  return getCurrentAccount()
    .then(async (account): Promise<DashboardState> => {
      if (!account) throw new Error("no session")
      const data = await getDashboard(account.id, filter, getToday())
      if (data.status === "empty") return { status: "empty", caption: formatWeekCaption(data.week.start, data.week.end) }
      return { status: "ready", view: buildView(data) }
    })
    .catch((): DashboardState => ({ status: "error" }))
}

export function useDashboard() {
  const [state, setState] = useState<DashboardState>({ status: "loading" })
  const [filter, setFilter] = useState<RouteFilter>("all")
  const [selectedWeek, setSelectedWeek] = useState(CURRENT_WEEK)
  // Descarta a resposta de uma aba que já não é a escolhida
  const latest = useRef<RouteFilter>("all")

  // Com cacheComponents a rota vive em <Activity>: o efeito roda de novo cada vez que a tela volta a aparecer.
  // setState só dentro do .then: regra react-hooks/set-state-in-effect. O cleanup volta a "loading".
  useEffect(() => {
    let active = true
    load(latest.current).then((next) => {
      if (active) setState(next)
    })
    return () => {
      active = false
      setState({ status: "loading" })
    }
  }, [])

  function reload(value: RouteFilter) {
    latest.current = value
    setState({ status: "loading" })
    load(value).then((next) => {
      if (latest.current === value) setState(next)
    })
  }

  function selectFilter(value: RouteFilter) {
    setFilter(value)
    setSelectedWeek(CURRENT_WEEK)
    reload(value)
  }


  // "Tentar de novo": em handler, setState direto é permitido
  function retry() {
    reload(filter)
  }

  return { state, filter, selectFilter, selectedWeek, selectWeek: setSelectedWeek, retry }
}
