import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

export function BackHeader({
  title,
  description,
  href = "/sign-in",
  label = "Voltar para Entrar",
}: {
  title: string
  description?: string
  href?: string
  label?: string
}) {
  return (
    <header className="flex flex-col gap-2">
      <Button asChild variant="ghost" size="icon" className="-ml-2.5 text-foreground">
        <Link href={href} aria-label={label}>
          <ChevronLeft />
        </Link>
      </Button>
      <h1 className="titulo-tela">{title}</h1>
      {description && <p className="corpo text-muted-foreground">{description}</p>}
    </header>
  )
}
