"use client"

import { BackHeader } from "@/components/back-header"
import { RouteForm } from "@/components/route-form"

import { useNewRoute } from "./use-new-route"

export default function NewRoutePage() {
  const { weekdays, setWeekdays, rows, addRow, removeRow, submitting, fieldErrors, formError, submit } = useNewRoute()

  return (
    <RouteForm
      header={
        <BackHeader
          title="Criar rota"
          description="Depois de salva, a rota já aparece pra quem busca van na sua cidade."
          href="/operator"
          label="Voltar para o início"
        />
      }
      submitLabel="Salvar rota"
      weekdays={weekdays}
      onWeekdaysChange={setWeekdays}
      rows={rows}
      onAddRow={addRow}
      onRemoveRow={removeRow}
      fieldErrors={fieldErrors}
      formError={formError}
      submitting={submitting}
      onSubmit={submit}
    />
  )
}
