import { Check, MapPin, Phone, X } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { SeatRequest } from "@/types"

// Cartão de um pedido. Sem onAccept/onDecline é o aluno que já foi aceito: só mostra e deixa ligar.
export function RequestCard({
  request,
  dayLabel,
  onAccept,
  onDecline,
  disabled,
}: {
  request: SeatRequest
  dayLabel: string
  onAccept?: () => void
  onDecline?: () => void
  disabled?: boolean
}) {
  const withActions = onAccept && onDecline

  return (
    <Card className="gap-3 px-4">
      <div className="flex items-center gap-3">
        <Avatar tone="highlight" aria-hidden="true">
          <AvatarFallback>{request.studentName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="titulo-card truncate">{request.studentName}</h3>
          {withActions && <span className="legenda text-muted-foreground">Pediu {dayLabel}</span>}
        </div>
        <Button asChild variant="ghost" size="icon" className="text-primary">
          <a href={`tel:${request.studentPhone.replace(/\D/g, "")}`} aria-label={`Ligar para ${request.studentName}`}>
            <Phone aria-hidden="true" />
          </a>
        </Button>
      </div>
      <div className="apoio flex flex-col gap-1.5 rounded-md bg-background px-3 py-2.5 font-semibold">
        <div className="flex items-center gap-2">
          <MapPin aria-hidden="true" className="size-4 text-muted-foreground" />
          <span>
            {request.boardingPoint.name} · {request.boardingPoint.time}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Phone aria-hidden="true" className="size-4 text-muted-foreground" />
          <span>{request.studentPhone}</span>
        </div>
      </div>
      {withActions && (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" className="text-destructive-text" onClick={onDecline} disabled={disabled}>
            <X aria-hidden="true" />
            Recusar
          </Button>
          <Button type="button" onClick={onAccept} disabled={disabled}>
            <Check aria-hidden="true" />
            Aceitar
          </Button>
        </div>
      )}
    </Card>
  )
}
