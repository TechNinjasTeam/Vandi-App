// Vandi · cofre: Design System/Código/components/ui/alert.tsx (copiar 1:1, não editar à mão)
// Caixa de aviso com ícone Info: explica uma regra ("Só a ida. Você paga R$ 9 direto pro Carlos").
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "apoio relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-sm px-3 py-2.5 has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-2 [&>svg]:size-4 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        // Sobre o fundo da tela: card com borda
        default:
          "border border-border bg-card text-card-foreground [&>svg]:text-secondary-foreground",
        // Dentro de um card ou Drawer: fundo da tela, sem borda
        suave: "bg-background text-foreground [&>svg]:text-secondary-foreground",
        // Erro que não é de um campo só
        destructive:
          "border border-border bg-card text-destructive-text [&>svg]:text-current",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      // Aviso fixo não interrompe o leitor de tela; só o erro anuncia sozinho.
      role={variant === "destructive" ? "alert" : undefined}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("corpo-forte col-start-2", className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("col-start-2 grid justify-items-start gap-1", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
