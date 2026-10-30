"use client"

// CAMADA 2 · HOOK. Só guarda o estado da tela e chama o service.
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { readRouteForm, type PointRow } from "@/components/route-form"
import { createRoute } from "@/services/routes"
import { getCurrentAccount } from "@/services/session"
import type { NewRouteFieldErrors, Weekday } from "@/types"

const defaultWeekdays: Weekday[] = ["mon", "tue", "wed", "thu", "fri"]

export function useNewRoute() {
  const router = useRouter()
  const [weekdays, setWeekdays] = useState<Weekday[]>(defaultWeekdays)
  const nextKey = useRef(1)
  const [rows, setRows] = useState<PointRow[]>([{ key: 0 }])
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<NewRouteFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  function addRow() {
    setRows((current) => [...current, { key: nextKey.current++ }])
  }

  // Erros de linha são por posição: ao remover uma linha, somem para não cair na linha errada.
  function removeRow(key: number) {
    setRows((current) => current.filter((row) => row.key !== key))
    setFieldErrors((current) => ({ ...current, boardingPointRows: undefined }))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // currentTarget some depois do 1º await
    const form = event.currentTarget
    const input = readRouteForm(form, weekdays)
    setSubmitting(true)
    setFieldErrors({})
    setFormError(null)
    try {
      const account = await getCurrentAccount()
      if (!account) throw new Error("no session")
      const result = await createRoute(account.id, input)
      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
        else setFormError(result.error)
        return
      }
      // O Activity guarda o formulário entre navegações: zera no sucesso.
      form.reset()
      setWeekdays(defaultWeekdays)
      setRows([{ key: 0 }])
      nextKey.current = 1
      router.replace("/operator")
    } catch {
      setFormError("Não deu pra salvar. Tenta de novo.")
    } finally {
      setSubmitting(false)
    }
  }

  return { weekdays, setWeekdays, rows, addRow, removeRow, submitting, fieldErrors, formError, submit }
}
