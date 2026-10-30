"use client"

// CAMADA 2 · HOOK da tela Editar rota. Só guarda o estado e chama os services.
import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { readRouteForm, type PointRow, type RouteFormDefaults } from "@/components/route-form"
import { formatMonthlyPrice, getOperatorRoute, POINT_IN_USE, updateRoute } from "@/services/routes"
import { getCurrentAccount } from "@/services/session"
import type { EditableRoute, NewRouteFieldErrors, Weekday } from "@/types"

type EditRouteState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "not_found" }
  | { status: "ready"; route: EditableRoute; defaults: RouteFormDefaults }

function load(id: string): Promise<EditRouteState> {
  return getCurrentAccount()
    .then(async (account): Promise<EditRouteState> => {
      if (!account) throw new Error("no session")
      const route = await getOperatorRoute(account.id, id)
      if (!route) return { status: "not_found" }
      return {
        status: "ready",
        route,
        defaults: {
          origin: route.origin,
          outboundTime: route.outboundTime,
          returnTime: route.returnTime,
          seats: route.seats,
          monthlyPrice: formatMonthlyPrice(route.monthlyPrice),
        },
      }
    })
    .catch((): EditRouteState => ({ status: "error" }))
}

export function useEditRoute() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [state, setState] = useState<EditRouteState>({ status: "loading" })
  const [weekdays, setWeekdays] = useState<Weekday[]>([])
  const nextKey = useRef(0)
  const [rows, setRows] = useState<PointRow[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<NewRouteFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  function apply(next: EditRouteState) {
    if (next.status === "ready") {
      const points = next.route.boardingPoints.map(({ id, name, time }, key) => ({ key, id, name, time }))
      setWeekdays(next.route.weekdays)
      setRows(points)
      nextKey.current = points.length
      setFieldErrors({})
      setFormError(null)
    }
    setState(next)
  }

  // Com cacheComponents a rota vive em <Activity>: o efeito roda de novo cada vez que a tela volta a aparecer,
  // e o cleanup volta a "loading", então o formulário remonta com os valores salvos. `active` descarta carga atrasada.
  useEffect(() => {
    let active = true
    load(id).then((next) => {
      if (active) apply(next)
    })
    return () => {
      active = false
      setState({ status: "loading" })
    }
  }, [id])

  // "Tentar de novo": em handler, setState direto é permitido
  function retry() {
    setState({ status: "loading" })
    load(id).then(apply)
  }

  function addRow() {
    setRows((current) => [...current, { key: nextKey.current++ }])
  }

  // Ponto com aluno fica e ganha o aviso (DEC-064); os outros saem. Erros de linha são por posição: somem.
  function removeRow(key: number) {
    const inUse = state.status === "ready" ? state.route.pointsInUse : []
    setRows((current) =>
      current.flatMap((row) =>
        row.key !== key ? [row] : row.id && inUse.includes(row.id) ? [{ ...row, blockedError: POINT_IN_USE }] : []
      )
    )
    setFieldErrors((current) => ({ ...current, boardingPointRows: undefined }))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // currentTarget some depois do 1º await
    const input = readRouteForm(event.currentTarget, weekdays)
    setSubmitting(true)
    setFieldErrors({})
    setFormError(null)
    try {
      const account = await getCurrentAccount()
      if (!account) throw new Error("no session")
      const result = await updateRoute(account.id, id, input)
      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
        else setFormError(result.error)
        return
      }
      router.replace("/operator/routes")
    } catch {
      setFormError("Não deu pra salvar. Tenta de novo.")
    } finally {
      setSubmitting(false)
    }
  }

  return { state, retry, weekdays, setWeekdays, rows, addRow, removeRow, submitting, fieldErrors, formError, submit }
}
