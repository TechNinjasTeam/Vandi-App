"use client"

import { useEffect, useRef } from "react"
import { Lock, Plus } from "lucide-react"

import { BoardingPointRow } from "@/components/boarding-point-row"
import { FormField } from "@/components/form-field"
import { TimeField } from "@/components/time-field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { NewRouteFieldErrors, NewRouteInput, Weekday } from "@/types"

const days: { value: Weekday; short: string; name: string }[] = [
  { value: "mon", short: "Seg", name: "Segunda" },
  { value: "tue", short: "Ter", name: "Terça" },
  { value: "wed", short: "Qua", name: "Quarta" },
  { value: "thu", short: "Qui", name: "Quinta" },
  { value: "fri", short: "Sex", name: "Sexta" },
  { value: "sat", short: "Sáb", name: "Sábado" },
]

/** Uma linha de ponto. `key` é de tela (estável ao remover); `id` só existe para ponto já salvo (Editar rota). */
export type PointRow = { key: number; id?: string; name?: string; time?: string; blockedError?: string }

export type RouteFormDefaults = {
  origin: string
  outboundTime: string
  returnTime: string
  seats: number
  monthlyPrice: string
}

/** Lê o formulário como o operador digitou. `""` em pointId = ponto novo, sem id. */
export function readRouteForm(form: HTMLFormElement, weekdays: Weekday[]): NewRouteInput {
  const data = new FormData(form)
  const field = (name: string) => String(data.get(name) ?? "")
  const pointIds = data.getAll("pointId")
  const pointTimes = data.getAll("pointTime")
  return {
    origin: field("origin"),
    weekdays,
    outboundTime: field("outboundTime"),
    returnTime: field("returnTime"),
    seats: field("seats"),
    monthlyPrice: field("monthlyPrice"),
    boardingPoints: data.getAll("pointName").map((name, i) => ({
      id: String(pointIds[i] ?? "") || undefined,
      name: String(name),
      time: String(pointTimes[i] ?? ""),
    })),
  }
}

// Formulário de Criar rota e de Editar rota: o cabeçalho e o texto do botão vêm da tela.
export function RouteForm({
  header,
  submitLabel,
  defaults,
  weekdays,
  onWeekdaysChange,
  rows,
  onAddRow,
  onRemoveRow,
  fieldErrors,
  formError,
  submitting,
  onSubmit,
}: {
  header: React.ReactNode
  submitLabel: string
  defaults?: RouteFormDefaults
  weekdays: Weekday[]
  onWeekdaysChange: (weekdays: Weekday[]) => void
  rows: PointRow[]
  onAddRow: () => void
  onRemoveRow: (key: number) => void
  fieldErrors: NewRouteFieldErrors
  formError: string | null
  submitting: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const footerError = fieldErrors.boardingPoints ?? formError
  const formRef = useRef<HTMLFormElement>(null)
  const wasSubmitting = useRef(false)

  // Salvar falhou: leva o primeiro campo com erro ao centro da tela, longe do rodapé fixo.
  // Só reage ao fim de um envio (submitting true → false), não à montagem nem ao digitar.
  useEffect(() => {
    if (wasSubmitting.current && !submitting) {
      const invalid = formRef.current?.querySelector<HTMLElement>(
        '[aria-invalid="true"], [data-invalid="true"], [aria-describedby="weekdays-error"]'
      )
      invalid?.focus({ preventScroll: true })
      invalid?.scrollIntoView({ block: "center" })
    }
    wasSubmitting.current = submitting
  }, [submitting])

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-1 flex-col gap-6">
      {header}

      <Card className="py-5">
        <CardContent className="flex flex-col gap-4">
          <h2 className="titulo-card">Trajeto</h2>
          <FormField
            id="origin"
            name="origin"
            label="Cidade de origem"
            placeholder="Ex.: Itu"
            defaultValue={defaults?.origin}
            error={fieldErrors.origin}
          />
          <FormField
            id="college"
            label="Faculdade"
            defaultValue="Facens"
            readOnly
            className="border-border bg-muted"
            action={
              <span className="flex size-11 items-center justify-center text-muted-foreground">
                <Lock className="size-4" aria-hidden="true" />
              </span>
            }
            hint={<span className="legenda text-muted-foreground">Por enquanto o Vandi é só pra Facens.</span>}
          />
        </CardContent>
      </Card>

      <Card className="py-5">
        <CardContent className="flex flex-col gap-4">
          <h2 className="titulo-card">Quando</h2>
          <fieldset className="flex flex-col gap-2">
            <legend className="apoio mb-2">Dias da semana</legend>
            <ToggleGroup
              type="multiple"
              className="grid grid-cols-6"
              value={weekdays}
              onValueChange={(value) => onWeekdaysChange(value as Weekday[])}
              aria-describedby={fieldErrors.weekdays ? "weekdays-error" : undefined}
            >
              {days.map(({ value, short, name }) => (
                <ToggleGroupItem key={value} value={value} aria-label={name}>
                  {short}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {fieldErrors.weekdays && (
              <span id="weekdays-error" className="apoio text-destructive-text">
                {fieldErrors.weekdays}
              </span>
            )}
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <TimeField
              id="outboundTime"
              name="outboundTime"
              label="Horário de ida"
              defaultValue={defaults?.outboundTime}
              error={fieldErrors.outboundTime}
            />
            <TimeField
              id="returnTime"
              name="returnTime"
              label="Horário de volta"
              defaultValue={defaults?.returnTime}
              error={fieldErrors.returnTime}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="py-5">
        <CardContent className="flex flex-col gap-4">
          <h2 className="titulo-card">A van</h2>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="seats"
              name="seats"
              type="number"
              inputMode="numeric"
              min={1}
              defaultValue={defaults?.seats ?? 15}
              label="Lugares"
              error={fieldErrors.seats}
            />
            <FormField
              id="monthlyPrice"
              name="monthlyPrice"
              inputMode="decimal"
              placeholder="R$ 0,00"
              defaultValue={defaults?.monthlyPrice}
              label="Mensalidade"
              error={fieldErrors.monthlyPrice}
              // Substitui o aria-describedby do FormField: erro e ajuda juntos.
              aria-describedby={[fieldErrors.monthlyPrice && "monthlyPrice-error", "monthlyPrice-help"]
                .filter(Boolean)
                .join(" ")}
            />
          </div>
          <p id="monthlyPrice-help" className="legenda text-muted-foreground">
            A mensalidade só aparece pro aluno. O pagamento continua com você, fora do app.
          </p>
        </CardContent>
      </Card>

      <Card className="py-5">
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="titulo-card">Pontos de embarque</h2>
            <span className="apoio text-muted-foreground">Na ordem em que a van passa.</span>
          </div>
          {rows.map((row, i) => (
            <BoardingPointRow
              key={row.key}
              rowKey={row.key}
              position={i + 1}
              pointId={row.id}
              defaultName={row.name}
              defaultTime={row.time}
              blockedError={row.blockedError}
              error={fieldErrors.boardingPointRows?.[i]}
              onRemove={rows.length > 1 ? () => onRemoveRow(row.key) : undefined}
            />
          ))}
          <Button type="button" variant="tracejado" className="w-full" onClick={onAddRow}>
            <Plus aria-hidden="true" /> Adicionar ponto
          </Button>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 -mb-6 mt-auto flex flex-col gap-3 border-t border-border bg-card px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {footerError && (
          <Alert variant="destructive">
            <AlertDescription>{footerError}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
