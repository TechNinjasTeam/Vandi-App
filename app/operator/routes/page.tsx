"use client"

// CAMADA 1 · Minha rota do operador. Só desenha e chama o hook. Moldura e barra vêm do OperatorLayout.
import { Bus, Pencil, Plus } from "lucide-react"
import Link from "next/link"

import { RouteCard } from "@/components/route-card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { useOperatorRoutes } from "./use-operator-routes"

export default function OperatorRoutesPage() {
  const { state, retry } = useOperatorRoutes()

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Carregando">
        <Skeleton className="h-14" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[290px] rounded-xl" />
          <Skeleton className="h-[290px] rounded-xl" />
        </div>
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-3">
        <Alert variant="destructive">
          <AlertDescription>Não deu pra carregar. Tenta de novo.</AlertDescription>
        </Alert>
        <Button variant="secondary" size="lg" onClick={retry}>
          Tentar de novo
        </Button>
      </div>
    )
  }

  const count = state.routes.length

  return (
    <>
      <header className="flex flex-col gap-1">
        {count > 0 && <span className="legenda text-muted-foreground">{count === 1 ? "1 rota cadastrada" : `${count} rotas cadastradas`}</span>}
        <h1 className="titulo-tela">Minha rota</h1>
      </header>

      {count === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center">
          <span aria-hidden="true" className="mb-1 flex size-12 items-center justify-center rounded-full bg-inverse text-inverse-foreground">
            <Bus className="size-5" />
          </span>
          <span className="titulo-card">Você ainda não tem rota</span>
          <Button asChild className="mt-2">
            <Link href="/operator/new-route">Criar rota</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {state.routes.map(({ route, daysLabel, priceLabel, pointsLabel }) => (
              <li key={route.id}>
                <RouteCard route={route} daysLabel={daysLabel} priceLabel={priceLabel} pointsLabel={pointsLabel}>
                  <Button asChild variant="secondary" size="lg" className="w-full">
                    <Link href={`/operator/routes/${route.id}/edit`}>
                      <Pencil aria-hidden="true" />
                      Editar rota
                    </Link>
                  </Button>
                </RouteCard>
              </li>
            ))}
          </ul>
          <Button asChild variant="tracejado">
            <Link href="/operator/new-route">
              <Plus aria-hidden="true" />
              Criar nova rota
            </Link>
          </Button>
        </>
      )}
    </>
  )
}
