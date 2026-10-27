import { X } from "lucide-react"

import { FormField } from "@/components/form-field"
import { TimeField } from "@/components/time-field"
import { Button } from "@/components/ui/button"

export function BoardingPointRow({
  rowKey,
  position,
  error,
  onRemove,
}: {
  rowKey: number
  position: number
  error?: { name?: string; time?: string }
  onRemove?: () => void
}) {
  return (
    <div className="flex flex-col items-end">
      <div className="flex w-full items-start gap-2">
        {/* mt-9: rótulo (~20px) + 6px de espaço + (48 - 28) / 2 = centro do campo */}
        <span
          aria-hidden="true"
          className="micro mt-9 flex size-7 flex-none items-center justify-center rounded-full bg-highlight text-highlight-foreground"
        >
          {position}
        </span>
        <div className="min-w-0 flex-1">
          <FormField
            id={`point-name-${rowKey}`}
            name="pointName"
            label="Nome do ponto"
            placeholder="Ex.: Praça da Matriz"
            error={error?.name}
          />
        </div>
        <div className="w-24 flex-none">
          <TimeField id={`point-time-${rowKey}`} name="pointTime" label="Horário" className="px-2" error={error?.time} />
        </div>
      </div>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Remover ponto ${position}`}
          onClick={onRemove}
        >
          <X />
          Remover ponto
        </Button>
      )}
    </div>
  )
}
