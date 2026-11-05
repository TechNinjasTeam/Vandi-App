"use client"

// CAMADA 1 · TELA 6 (Buscar vans, aba Vaga fixa). Só desenha e chama o hook. Moldura e barra vêm do StudentLayout.
import { Bus, GraduationCap, Search } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { SingleTripList } from "./single-trip-list"
import { useVanSearch } from "./use-van-search"
import { VanCard } from "./van-card"

export default function VanSearchPage() {
  const { state, query, search, retry } = useVanSearch()

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Carregando">
        <Skeleton className="h-14" />
        <Skeleton className="h-[52px] rounded-full" />
        <Skeleton className="h-[86px] rounded-md" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[172px] rounded-xl" />
          <Skeleton className="h-[172px] rounded-xl" />
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

  const { vans } = state
  const resultTitle = vans.length === 0 ? "Nenhuma van" : vans.length === 1 ? "1 van encontrada" : `${vans.length} vans encontradas`

  return (
    <>
      <header className="flex flex-col gap-1">
        <span className="legenda text-muted-foreground">Oi, {state.firstName}</span>
        <h1 className="titulo-tela">Buscar vans</h1>
      </header>

      <Tabs defaultValue="fixed" className="gap-6">
        <TabsList aria-label="Tipo de vaga">
          <TabsTrigger value="fixed">Vaga fixa</TabsTrigger>
          <TabsTrigger value="single">Só um dia</TabsTrigger>
        </TabsList>

        <TabsContent value="fixed" className="flex flex-col gap-6">
        <form role="search" className="flex flex-col gap-3" onSubmit={(event) => event.preventDefault()}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">De onde você sai?</Label>
            <div className="relative flex">
              <Search aria-hidden="true" className="pointer-events-none absolute top-3.5 left-3.5 size-5 text-muted-foreground" />
              <Input
                id="city"
                type="search"
                autoComplete="address-level2"
                placeholder="Sua cidade"
                className="pl-11"
                value={query}
                onChange={(event) => search(event.target.value)}
              />
            </div>
          </div>
          <div className="apoio flex items-center gap-2 text-muted-foreground">
            <span>Indo pra</span>
            <Badge variant="highlight">
              <GraduationCap aria-hidden="true" />
              Facens
            </Badge>
          </div>
        </form>

        <section aria-labelledby="results-title" className="flex flex-col gap-3">
          <h2 id="results-title" className="titulo-card">
            {resultTitle}
          </h2>
          {vans.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center">
              <span aria-hidden="true" className="mb-1 flex size-12 items-center justify-center rounded-full bg-inverse text-inverse-foreground">
                <Bus className="size-5" />
              </span>
              <span className="titulo-card">Ainda não tem van cadastrada pra essa cidade</span>
              <span className="apoio max-w-[280px] text-muted-foreground">Confira se o nome está certo ou tente uma cidade vizinha.</span>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {vans.map((item) => (
                <li key={item.van.id}>
                  <VanCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>
        </TabsContent>

        <TabsContent value="single">
          <SingleTripList />
        </TabsContent>
      </Tabs>
    </>
  )
}
