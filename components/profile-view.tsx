"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useProfile } from "@/hooks/use-profile"

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
}

const subscribe = () => () => {}

// Seletor provisório (DEC-046): sem opção marcada até montar, para não piscar a errada.
function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)

  return (
    <section className="flex flex-col gap-2">
      <h2 id="appearance-title" className="apoio">
        Aparência
      </h2>
      <ToggleGroup
        type="single"
        aria-labelledby="appearance-title"
        className="grid grid-cols-3"
        value={mounted ? theme : ""}
        onValueChange={(value) => value && setTheme(value)}
      >
        <ToggleGroupItem value="light">Claro</ToggleGroupItem>
        <ToggleGroupItem value="dark">Escuro</ToggleGroupItem>
        <ToggleGroupItem value="system">Sistema</ToggleGroupItem>
      </ToggleGroup>
    </section>
  )
}

// Perfil provisório, igual para operador e aluno.
export function ProfileView() {
  const { state, retry, signOut, restore, restoring } = useProfile()

  return (
    <>
      <header className="flex flex-col gap-1">
        <span className="legenda text-muted-foreground">Sua conta</span>
        <h1 className="titulo-tela">Perfil</h1>
      </header>

      {state.status === "loading" && <Skeleton className="h-[88px] rounded-xl" aria-label="Carregando" />}

      {state.status === "error" && (
        <div className="flex flex-col gap-3">
          <Alert variant="destructive">
            <AlertDescription>Não foi possível carregar sua conta.</AlertDescription>
          </Alert>
          <Button variant="secondary" size="lg" onClick={retry}>
            Tentar de novo
          </Button>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <Card>
            <CardContent className="flex items-center gap-3">
              <Avatar size="lg">
                <AvatarFallback>{initials(state.account.name)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="titulo-card truncate">{state.account.name}</span>
                <span className="apoio truncate text-muted-foreground">{state.account.email}</span>
              </div>
              <Badge>{state.account.role === "operator" ? "Operador" : "Aluno"}</Badge>
            </CardContent>
          </Card>

          <ThemeSelector />

          <div className="flex flex-col gap-3">
            <Button variant="outline" size="lg" className="w-full" onClick={signOut}>
              Sair da conta
            </Button>
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="lg" className="w-full">
                  Restaurar dados de demonstração
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Restaurar os dados de demonstração?</DrawerTitle>
                  <DrawerDescription>
                    Tudo o que foi feito no app volta ao começo e você sai da conta.
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <Button variant="destructive" size="lg" disabled={restoring} onClick={restore}>
                    Restaurar dados
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="ghost" size="lg">
                      Agora não
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
        </>
      )}
    </>
  )
}
