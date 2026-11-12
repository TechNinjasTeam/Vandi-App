"use client"

// CAMADA 1 · TELA. Só desenha e chama o hook. Nunca importa `mocks/` nem `services/storage.ts`.
// Fora das áreas protegidas (/operator, /student): sem guarda de papel e sem barra inferior.
// Toda tela nova começa copiando esta pasta. Passo a passo em README.md.
import { Search } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"

import { useExample } from "./use-example"

export default function ExamplePage() {
  const { state, retry } = useExample()

  return (
    // Moldura de toda tela (Padrões de tela.md). Sem barra: não tem BottomNav aqui.
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background">
      <main className="flex flex-1 flex-col gap-6 px-4 pt-6 pb-6">
        {/* Cabeçalho: legenda + título */}
        <header className="flex flex-col gap-1">
          <span className="legenda text-muted-foreground">Tela-exemplo</span>
          <h1 className="titulo-tela">Rotas</h1>
        </header>

        {/* Os 4 estados. O hook diz qual; a tela só escolhe o desenho. */}

        {/* 1. Carregando: Skeleton do mesmo formato do cartão (altura e cantos iguais) */}
        {state.status === "loading" && (
          <div className="flex flex-col gap-3" role="status" aria-busy="true" aria-label="Carregando">
            <Skeleton className="h-[148px] rounded-xl" />
            <Skeleton className="h-[148px] rounded-xl" />
          </div>
        )}

        {/* 2. Erro: mensagem + "Tentar de novo". Leitura que falha mostra texto fixo da tela;
            texto de erro vindo do service vale para gravações (`Result` com `error` em português). */}
        {state.status === "error" && (
          <div className="flex flex-col gap-3">
            <Alert variant="destructive">
              <AlertDescription>Não foi possível carregar as rotas.</AlertDescription>
            </Alert>
            <Button variant="secondary" size="lg" onClick={retry}>
              Tentar de novo
            </Button>
          </div>
        )}

        {/* 3. Vazio: cartão tracejado com ícone, título e o que fazer */}
        {state.status === "empty" && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center">
            <span aria-hidden="true" className="mb-1 flex size-12 items-center justify-center rounded-full bg-inverse text-inverse-foreground">
              <Search className="size-5" />
            </span>
            <span className="titulo-card">Nenhuma rota por aqui</span>
            <span className="apoio max-w-[280px] text-muted-foreground">
              Quando um operador cadastrar uma rota, ela aparece nesta lista.
            </span>
          </div>
        )}

        {/* 4. Sucesso: um cartão por rota (Cartão de rota, Padrões de tela.md) */}
        {state.status === "success" && (
          <ul className="flex flex-col gap-3">
            {state.routes.map((route) => (
              <li key={route.id}>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {route.origin} → {route.destination}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-0.5 rounded-sm bg-background px-3 py-2.5">
                      <span className="legenda text-muted-foreground">Ida</span>
                      <span className="corpo-forte">{route.outboundTime}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 rounded-sm bg-background px-3 py-2.5">
                      <span className="legenda text-muted-foreground">Volta</span>
                      <span className="corpo-forte">{route.returnTime}</span>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {/* Janela de exemplo: no Vandi é sempre Drawer (sobe da base), nunca Dialog.
            O Toaster já está no layout raiz; aqui só se chama toast.success(...). */}
        <Drawer>
          <DrawerTrigger asChild>
            <Button size="lg" className="w-full">
              Abrir janela de exemplo
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Janela de exemplo</DrawerTitle>
              <DrawerDescription>
                Toda janela que sobe da base da tela é um Drawer, nunca um Dialog.
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              {/* DrawerClose fecha a janela; o onClick roda a ação */}
              <DrawerClose asChild>
                <Button size="lg" onClick={() => toast.success("Aviso de exemplo")}>
                  Mostrar aviso
                </Button>
              </DrawerClose>
              <DrawerClose asChild>
                <Button variant="ghost" size="lg">
                  Agora não
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </main>
    </div>
  )
}
