import { ArrowDown, ArrowUp, Minus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { Trend } from "@/types"

// Etiqueta de comparação: palavra + ícone + cor. Sem comparação (null): não aparece.
export function TrendBadge({ trend }: { trend: Trend | null }) {
  if (trend === "better") {
    return (
      <Badge className="bg-chart-2 text-highlight-foreground">
        <ArrowUp aria-hidden="true" />
        Melhorou
      </Badge>
    )
  }
  if (trend === "worse") {
    return (
      <Badge variant="contagem">
        <ArrowDown aria-hidden="true" />
        Piorou
      </Badge>
    )
  }
  if (trend === "same") {
    return (
      <Badge className="bg-muted text-muted-foreground">
        <Minus aria-hidden="true" />
        Igual
      </Badge>
    )
  }
  return null
}
