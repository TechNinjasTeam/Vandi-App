// Vandi · cofre: Design System/Código/components/ui/button.tsx (copiar 1:1, não editar à mão)
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-bold whitespace-nowrap transition-[color,background-color,border-color,box-shadow] outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        // A ação principal da tela. Só uma por tela.
        default:
          "bg-primary font-display text-base text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground",
        // Segunda ação ("Não vou amanhã", "Encerrar chamada").
        secondary:
          "bg-secondary font-display text-base text-secondary-foreground hover:bg-secondary/80 disabled:bg-muted disabled:text-muted-foreground",
        // Ação neutra ao lado de outra ("Ligar").
        outline:
          "border border-input bg-card font-display text-base text-foreground hover:bg-accent hover:text-accent-foreground disabled:border-border disabled:text-muted-foreground",
        // Acrescentar algo à lista ("Adicionar ponto").
        tracejado:
          "border border-dashed border-input bg-transparent font-display text-base text-secondary-foreground hover:bg-accent disabled:border-border disabled:text-muted-foreground",
        // Apaga ou recusa. Sempre confirmado num Drawer.
        destructive:
          "bg-destructive font-display text-base text-white hover:bg-destructive/90 disabled:bg-muted disabled:text-muted-foreground",
        // Ação discreta ("Agora não", "Ver todos"). Texto Nunito 14.
        ghost:
          "font-sans text-sm text-secondary-foreground hover:bg-accent hover:text-accent-foreground disabled:text-muted-foreground",
        link: "font-sans text-sm text-secondary-foreground underline-offset-4 hover:underline disabled:text-muted-foreground",
      },
      size: {
        default: "h-12 px-5 has-[>svg]:px-4", // 48px: control-h
        lg: "h-[54px] px-6 text-[17px] has-[>svg]:px-5", // 54px: botão de rodapé, largura total
        sm: "h-11 gap-1.5 rounded-sm px-3.5 font-sans text-sm [&_svg:not([class*='size-'])]:size-4", // 44px: ação dentro de cartão
        icon: "size-11 rounded-sm", // 44px: voltar, fechar
        // Tamanhos do shadcn mantidos só por compatibilidade: nada clicável abaixo de 44px.
        xs: "h-11 gap-1.5 rounded-sm px-3.5 font-sans text-sm [&_svg:not([class*='size-'])]:size-4",
        "icon-xs": "size-11 rounded-sm",
        "icon-sm": "size-11 rounded-sm",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
