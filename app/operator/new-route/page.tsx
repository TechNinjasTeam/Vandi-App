"use client"

import { Lock, Plus } from "lucide-react"

import { BackHeader } from "@/components/back-header"
import { FormField } from "@/components/form-field"
import { TimeField } from "@/components/time-field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Weekday } from "@/types"

import { BoardingPointRow } from "./boarding-point-row"
import { useNewRoute } from "./use-new-route"

const days: { value: Weekday; short: string; name: string }[] = [
  { value: "mon", short: "Seg", name: "Segunda" },
  { value: "tue", short: "Ter", name: "Terça" },
  { value: "wed", short: "Qua", name: "Quarta" },
  { value: "thu", short: "Qui", name: "Quinta" },
  { value: "fri", short: "Sex", name: "Sexta" },
  { value: "sat", short: "Sáb", name: "Sábado" },
]

export default function NewRoutePage() {
  const { weekdays, setWeekdays, rows, addRow, removeRow, submitting, fieldErrors, formError, submit } = useNewRoute()
  const footerError = fieldErrors.boardingPoints ?? formError

  return (
    <form noValidate onSubmit={submit} className="flex flex-1 flex-col gap-6">
      <BackHeader
        title="Criar rota"
        description="Depois de salva, a rota já aparece pra quem busca van na sua cidade."
        href="/operator"
        label="Voltar para o início"
      />

      <Card className="py-5">
        <CardContent className="flex flex-col gap-4">
          <h2 className="titulo-card">Trajeto</h2>
          <FormField
            id="origin"
            name="origin"
            label="Cidade de origem"
            placeholder="Ex.: Itu"
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
              onValueChange={(value) => setWeekdays(value as Weekday[])}
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
            <TimeField id="outboundTime" name="outboundTime" label="Horário de ida" error={fieldErrors.outboundTime} />
            <TimeField id="returnTime" name="returnTime" label="Horário de volta" error={fieldErrors.returnTime} />
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
              defaultValue={15}
              label="Lugares"
              error={fieldErrors.seats}
            />
            <FormField
              id="monthlyPrice"
              name="monthlyPrice"
              inputMode="decimal"
              placeholder="R$ 0,00"
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
          {rows.map((key, i) => (
            <BoardingPointRow
              key={key}
              rowKey={key}
              position={i + 1}
              error={fieldErrors.boardingPointRows?.[i]}
              onRemove={rows.length > 1 ? () => removeRow(key) : undefined}
            />
          ))}
          <Button type="button" variant="tracejado" className="w-full" onClick={addRow}>
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
          Salvar rota
        </Button>
      </div>
    </form>
  )
}
