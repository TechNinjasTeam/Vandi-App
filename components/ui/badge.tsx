// Vandi · cofre: Design System/Código/components/ui/badge.tsx (copiar 1:1, não editar à mão)
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Selo é sempre cor sólida. Única exceção: semResposta (e aviso), tracejados.
const badgeVariants = cva(
  "selo inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-1 whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3.5 [&>svg]:stroke-[2.5]",
  {
    variants: {
      variant: {
        // Informativo: "Você vai", "Aceita"
        default: "bg-primary text-primary-foreground",
        // Etiqueta lima: dias da rota ("seg a sex")
        highlight: "bg-highlight text-highlight-foreground",
        // Status: sempre ícone + palavra
        volto: "bg-volto text-volto-foreground", // <Check /> Volto
        naoVolto: "bg-nao-volto text-nao-volto-foreground", // <X /> Não volto
        semResposta:
          "border-dashed border-sem-resposta-border bg-sem-resposta text-sem-resposta-foreground", // <Clock /> Sem resposta
        // Contagem e etiqueta neutra: "3 pedidos", "Lotada por enquanto"
        contagem: "bg-inverse text-inverse-foreground",
        // Aviso neutro sobre a tela: "Dados de demonstração"
        aviso:
          "border-dashed border-sem-resposta-border bg-card text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
