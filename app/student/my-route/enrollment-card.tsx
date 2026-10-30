import { CircleCheck, CircleX, Clock } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { MyEnrollment } from "@/types"

export const firstName = (name: string) => name.trim().split(/\s+/)[0]

// Cartão de um pedido de vaga da Minha rota. "Aguardando" é o cartão tracejado do desenho `aguardando`.
export function EnrollmentCard({
  enrollment,
  onConfirm,
  onWithdraw,
}: {
  enrollment: MyEnrollment
  onConfirm: () => void
  onWithdraw: () => void
}) {
  const { route, boardingPoint, status } = enrollment
  const operator = firstName(enrollment.operatorName)

  return (
    <Card className={cn(status === "requested" && "border-[1.5px] border-dashed border-sem-resposta-border bg-transparent shadow-none")}>
      <CardHeader>
        <CardTitle>
          {route.origin} → {route.destination} · van de {operator}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {status === "requested" && (
          <Badge variant="semResposta">
            <Clock aria-hidden="true" />
            Aguardando
          </Badge>
        )}
        {status === "accepted" && (
          <Badge>
            <CircleCheck aria-hidden="true" />
            Aceito
          </Badge>
        )}
        {status === "declined" && (
          <Badge variant="naoVolto">
            <CircleX aria-hidden="true" />
            Recusado
          </Badge>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5 rounded-sm bg-background px-3 py-2.5">
            <span className="legenda text-muted-foreground">Ida · {boardingPoint.name}</span>
            <span className="corpo-forte">{boardingPoint.time}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-sm bg-background px-3 py-2.5">
            <span className="legenda text-muted-foreground">Volta · Facens</span>
            <span className="corpo-forte">{route.returnTime}</span>
          </div>
        </div>
        {status !== "declined" && (
          <span className="apoio text-muted-foreground">
            O contato de {operator} aparece aqui quando você ficar com a van.
          </span>
        )}
        {status === "accepted" && (
          <Button size="lg" className="w-full" onClick={onConfirm}>
            Ficar com esta van
          </Button>
        )}
        {status !== "declined" && (
          <Button variant="ghost" size="lg" className="w-full" onClick={onWithdraw}>
            Desistir
          </Button>
        )}
        {status === "declined" && (
          <Button asChild variant="link" size="sm" className="self-start">
            <Link href="/student/vans">Buscar outra van</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
