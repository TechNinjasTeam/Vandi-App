// Vandi · cofre: Design System/Código/components/ui/radio-group.tsx (copiar 1:1, não editar à mão)
// RadioGroupCard: opção em cartão (escolher o ponto de embarque, "Sou aluno / Sou operador").
"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-2.5", className)}
      {...props}
    />
  )
}

// Bolinha solta, para quando o rótulo fica fora (com <Label htmlFor>).
function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "relative flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 border-input bg-card outline-none after:absolute after:-inset-[11px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="size-2.5 rounded-full bg-card"
      />
    </RadioGroupPrimitive.Item>
  )
}

// Cartão inteiro clicável. Marcado: fundo secondary + borda primary de 2px.
function RadioGroupCard({
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-card"
      className={cn(
        "group/radio-card flex min-h-[60px] w-full items-center gap-3 rounded-lg border-2 border-border bg-card px-4 py-2.5 text-left text-card-foreground transition-[background-color,border-color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-secondary",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 border-input bg-card group-data-[state=checked]/radio-card:border-primary group-data-[state=checked]/radio-card:bg-primary"
      >
        <RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-card" />
      </span>
      {children}
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem, RadioGroupCard }
