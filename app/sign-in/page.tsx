"use client"

// Tela 1 · Entrar. Pré-login: sem guarda de papel e sem barra inferior.
import Image from "next/image"
import Link from "next/link"
import { Eye } from "lucide-react"

import { FormField } from "@/components/form-field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { useSignIn } from "./use-sign-in"

export default function SignInPage() {
  const { checking, submitting, error, showPassword, toggleShowPassword, submit } = useSignIn()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background">
      <main className="flex flex-1 flex-col gap-6 px-4 pt-14 pb-8">
        {checking ? (
          <div className="flex flex-col gap-6 pt-6" role="status" aria-busy="true" aria-label="Carregando">
            <Skeleton className="h-[52px] w-40" />
            <Skeleton className="h-[320px] rounded-xl" />
          </div>
        ) : (
          <>
            <header className="flex flex-col gap-3 pt-6">
              <h1 className="leading-none">
                {/* Única exceção ao "sem dark:" (DEC-046): o SVG tem cor fixa e a logo segue o tema escolhido no Perfil. */}
                <Image src="/vandi-logo.svg" alt="Vandi" width={158} height={52} className="h-[52px] w-auto dark:hidden" />
                <Image
                  src="/vandi-logo-branco.svg"
                  alt="Vandi"
                  width={158}
                  height={52}
                  className="hidden h-[52px] w-auto dark:block"
                />
              </h1>
              <p className="corpo text-muted-foreground">Vai de Vandi.</p>
            </header>

            <Card>
              <CardContent>
                <form noValidate onSubmit={submit} className="flex flex-col gap-4">
                  <FormField
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    label="E-mail"
                    placeholder="exemplo@email.com"
                  />
                  <FormField
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    label="Senha"
                    placeholder="Sua senha"
                    action={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground"
                        aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                        onClick={toggleShowPassword}
                      >
                        <Eye />
                      </Button>
                    }
                  />
                  <Link
                    href="/forgot-password"
                    className="apoio flex min-h-11 items-center self-end px-1 font-semibold text-secondary-foreground"
                  >
                    Esqueci a senha
                  </Link>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" size="lg" disabled={submitting}>
                    Entrar
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="flex-1" />

            <footer className="flex flex-col items-center gap-2">
              <span className="apoio text-muted-foreground">Primeira vez no Vandi?</span>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/sign-up">Criar conta</Link>
              </Button>
            </footer>
          </>
        )}
      </main>
    </div>
  )
}
