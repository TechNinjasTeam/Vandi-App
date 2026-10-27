import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

// ponytail: destino fixo (/sign-in); ganha props href/label quando outra tela voltar para outro lugar.
export function BackHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="flex flex-col gap-2">
      <Button asChild variant="ghost" size="icon" className="-ml-2.5 text-foreground">
        <Link href="/sign-in" aria-label="Voltar para Entrar">
          <ChevronLeft />
        </Link>
      </Button>
      <h1 className="titulo-tela">{title}</h1>
      {description && <p className="corpo text-muted-foreground">{description}</p>}
    </header>
  )
}
