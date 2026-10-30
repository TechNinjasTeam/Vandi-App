// Vandi · cofre: Design System/Código/components/ui/progress.tsx (copiar 1:1, não editar à mão)
// Barra reta de 8px. Sempre com o número escrito ao lado ("12 de 15 lugares").
"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  tone = "default",
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  // "destaque": dentro do Card variant="destaque" (trilho branco a 20%, barra lima)
  tone?: "default" | "destaque"
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-tone={tone}
      value={value}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full",
        tone === "default" ? "bg-border" : "bg-primary-foreground/20",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 rounded-full transition-transform",
          tone === "default" ? "bg-primary" : "bg-highlight"
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
