import { Check, Clock, Ticket, X } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { Passenger } from "@/types"

// Linha de um passageiro. `group` diz em qual grupo da lista ele está; o selo segue a palavra + ícone + cor.
export function PassengerRow({ passenger, group }: { passenger: Passenger; group: "going" | "notGoing" | "noResponse" }) {
  return (
    <div className="flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-1 py-1">
      <Avatar size="sm" aria-hidden="true">
        <AvatarFallback>{passenger.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="corpo min-w-[8rem] flex-1 truncate">{passenger.name}</span>
      {group === "going" &&
        (passenger.kind === "single" ? (
          <Badge variant="contagem">
            <Ticket aria-hidden="true" />
            Avulso
          </Badge>
        ) : (
          <Badge variant="volto">
            <Check aria-hidden="true" />
            Vou
          </Badge>
        ))}
      {group === "notGoing" && (
        <>
          {passenger.noResponse && (
            <Badge variant="semResposta">
              <Clock aria-hidden="true" />
              Sem resposta
            </Badge>
          )}
          <Badge variant="naoVolto">
            <X aria-hidden="true" />
            Não vou
          </Badge>
        </>
      )}
      {group === "noResponse" && (
        <Badge variant="semResposta">
          <Clock aria-hidden="true" />
          Sem resposta
        </Badge>
      )}
    </div>
  )
}
