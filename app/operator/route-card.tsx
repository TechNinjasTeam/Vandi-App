import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { OperatorRoute } from "@/types"

// Cartão de rota (Padrões de tela.md). Sobe para `components/` no segundo uso (#5).
export function RouteCard({ route, daysLabel }: { route: OperatorRoute; daysLabel: string }) {
  const cells = [
    { label: "Ida", value: route.outboundTime },
    { label: "Volta", value: route.returnTime },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {route.origin} → {route.destination}
        </CardTitle>
        <CardAction>
          <Badge variant="highlight">{daysLabel}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          {cells.map((cell) => (
            <div key={cell.label} className="flex flex-col gap-0.5 rounded-sm bg-background px-3 py-2.5">
              <span className="legenda text-muted-foreground">{cell.label}</span>
              <span className="corpo-forte">{cell.value}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="apoio flex justify-between text-muted-foreground">
            <span>Lugares ocupados</span>
            <span className="text-foreground">
              {route.occupiedSeats} de {route.seats}
            </span>
          </div>
          <Progress
            value={Math.round((route.occupiedSeats / route.seats) * 100)}
            aria-label={`Lugares ocupados em ${route.origin} → ${route.destination}`}
          />
        </div>
      </CardContent>
    </Card>
  )
}
