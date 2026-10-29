"use client"

// CAMADA 1 · TELA Editar rota. Só desenha e chama o hook. Moldura vem do OperatorLayout.
import Link from "next/link"

import { BackHeader } from "@/components/back-header"
import { RouteForm } from "@/components/route-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { useEditRoute } from "./use-edit-route"

export default function EditRoutePage() {
  const { state, retry, weekdays, setWeekdays, rows, addRow, removeRow, submitting, fieldErrors, formError, submit } =
    useEditRoute()

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Carregando">
        <Skeleton className="h-24" />
        <Skeleton className="h-[264px] rounded-xl" />
        <Skeleton className="h-[230px] rounded-xl" />
        <Skeleton className="h-[230px] rounded-xl" />
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-3">
        <Alert variant="destructive">
          <AlertDescription>Não deu pra carregar. Tenta de novo.</AlertDescription>
        </Alert>
        <Button variant="secondary" size="lg" onClick={retry}>
          Tentar de novo
        </Button>
      </div>
    )
  }

  if (state.status === "not_found") {
    return (
      <div className="flex flex-col gap-3">
        <Alert variant="destructive">
          <AlertDescription>Não achamos essa rota.</AlertDescription>
        </Alert>
        <Button asChild variant="secondary" size="lg">
          <Link href="/operator/routes">Voltar para Minha rota</Link>
        </Button>
      </div>
    )
  }

  return (
    <RouteForm
      header={
        <BackHeader
          title="Editar rota"
          description="As mudanças valem a partir da próxima viagem."
          href="/operator/routes"
          label="Voltar para Minha rota"
        />
      }
      submitLabel="Salvar mudanças"
      defaults={state.defaults}
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
