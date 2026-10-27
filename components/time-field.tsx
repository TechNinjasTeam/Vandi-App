"use client"

import * as React from "react"
import { Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const pad = (n: number) => String(n).padStart(2, "0")
const hours = Array.from({ length: 24 }, (_, i) => pad(i))
const minutes = Array.from({ length: 12 }, (_, i) => pad(i * 5))
const defaultDraft = "07:00"

// Coluna que rola. Ao abrir, centraliza o item escolhido sem rolar a página (scrollIntoView rolaria).
function PickerColumn({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string
  options: string[]
  selected: string
  onSelect: (option: string) => void
}) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const column = ref.current
    const item = column?.querySelector<HTMLElement>("[aria-pressed='true']")
    if (column && item) column.scrollTop = item.offsetTop - (column.clientHeight - item.offsetHeight) / 2
  }, [])

  return (
    <div className="flex flex-col gap-1.5">
      <span aria-hidden="true" className="legenda text-muted-foreground">
        {label}
      </span>
      <div
        ref={ref}
        role="group"
        aria-label={label}
        data-vaul-no-drag
        className="relative flex h-60 flex-col overflow-y-auto overscroll-contain"
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === selected}
            onClick={() => onSelect(option)}
            className={cn(
              "flex min-h-12 w-full flex-none items-center justify-center rounded-md text-base tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              option === selected ? "bg-secondary text-secondary-foreground" : "text-foreground"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

type TimeFieldProps = {
  id: string
  name: string
  label: string
  error?: string
  className?: string
}

// Seletor de horário em Drawer (DEC-053). O valor segue "HH:mm", ou "" quando vazio.
export function TimeField({ id, name, label, error, className }: TimeFieldProps) {
  const [value, setValue] = React.useState("")
  const [draft, setDraft] = React.useState(defaultDraft)
  const [open, setOpen] = React.useState(false)
  const hidden = React.useRef<HTMLInputElement>(null)

  // form.reset() não limpa o estado do React: o campo volta a --:-- ao ouvir o reset.
  React.useEffect(() => {
    const form = hidden.current?.form
    if (!form) return
    const reset = () => setValue("")
    form.addEventListener("reset", reset)
    return () => form.removeEventListener("reset", reset)
  }, [])

  function onOpenChange(next: boolean) {
    if (next) setDraft(value || defaultDraft)
    setOpen(next)
  }

  const [hour, minute] = draft.split(":")

  return (
    <div className="flex flex-col gap-1.5">
      <Label id={`${id}-label`} htmlFor={id}>
        {label}
      </Label>
      <input ref={hidden} type="hidden" name={name} value={value} />
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>
          <button
            id={id}
            type="button"
            aria-haspopup="dialog"
            aria-labelledby={`${id}-label ${id}-value`}
            data-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              "flex h-12 w-full min-w-0 items-center justify-between gap-1 rounded-md border border-input bg-card px-4 text-base tabular-nums text-foreground transition-[color,border-color,box-shadow] outline-none",
              "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "data-[invalid=true]:border-destructive data-[invalid=true]:ring-1 data-[invalid=true]:ring-destructive",
              className
            )}
          >
            <span id={`${id}-value`} className={cn(!value && "text-muted-foreground")}>
              {value || "--:--"}
            </span>
            <Clock className="size-4 flex-none text-muted-foreground" aria-hidden="true" />
          </button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{label}</DrawerTitle>
            <DrawerDescription>Escolha a hora e o minuto.</DrawerDescription>
          </DrawerHeader>
          <div className="grid grid-cols-2 gap-3">
            <PickerColumn label="Hora" options={hours} selected={hour} onSelect={(h) => setDraft(`${h}:${minute}`)} />
            <PickerColumn label="Minuto" options={minutes} selected={minute} onSelect={(m) => setDraft(`${hour}:${m}`)} />
          </div>
          <DrawerFooter>
            <Button
              size="lg"
              onClick={() => {
                setValue(draft)
                setOpen(false)
              }}
            >
              Confirmar horário
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" size="lg">
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      {error && (
        <span id={`${id}-error`} className="apoio text-destructive-text">
          {error}
        </span>
      )}
    </div>
  )
}
