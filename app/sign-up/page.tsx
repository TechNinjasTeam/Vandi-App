"use client"

import Link from "next/link"
import { Bus, GraduationCap, Phone } from "lucide-react"

import { BackHeader } from "@/components/back-header"
import { FormField } from "@/components/form-field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Role } from "@/types"

import { useSignUp } from "./use-sign-up"

const roles: { value: Role; Icon: typeof Bus; title: string; line: string }[] = [
  { value: "operator", Icon: Bus, title: "Tenho uma van", line: "Organizo a rota e os alunos" },
  { value: "student", Icon: GraduationCap, title: "Sou aluno", line: "Quero vaga numa van" },
]

const phoneHelp: Record<Role, string> = {
  student:
    "É por ele que o motorista fala com você no dia da viagem. Apenas o motorista tem acesso a essa informação.",
  operator: "É por ele que os alunos da sua rota falam com você. Só eles veem.",
}

export default function SignUpPage() {
  const { checking, role, setRole, submitting, fieldErrors, formError, submit } = useSignUp()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background">
      <main className="flex flex-1 flex-col gap-6 px-4 pt-4 pb-8">
        {checking ? (
          <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Carregando">
            <Skeleton className="h-20" />
            <Skeleton className="h-[120px] rounded-xl" />
            <Skeleton className="h-[420px] rounded-xl" />
          </div>
        ) : (
          <>
            <BackHeader title="Criar conta" description="Crie sua conta para começar." />

            <fieldset>
              <legend className="apoio mb-2">Quem é você?</legend>
              <div className="grid grid-cols-2 gap-2">
                {roles.map(({ value, Icon, title, line }) => {
                  const pressed = role === value
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={pressed}
                      onClick={() => setRole(value)}
                      className={cn(
                        "flex min-h-[120px] flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left",
                        pressed ? "border-primary bg-secondary" : "border-border bg-card",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-9 items-center justify-center rounded-full",
                          pressed ? "bg-primary text-primary-foreground" : "bg-inverse text-inverse-foreground",
                        )}
                      >
                        <Icon className="size-5" />
                      </span>
                      <span className="titulo-card">{title}</span>
                      <span className="legenda font-bold text-muted-foreground">{line}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <Card className="py-5">
              <CardContent>
                <form noValidate onSubmit={submit} className="flex flex-col gap-4">
                  <FormField
                    id="name"
                    name="name"
                    label="Nome"
                    autoComplete="name"
                    placeholder="Seu nome"
                    error={fieldErrors.name}
                  />
                  <FormField
                    id="phone"
                    name="phone"
                    label="Telefone com DDD"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(00) 00000-0000"
                    error={fieldErrors.phone}
                    hint={
                      <Alert>
                        <Phone />
                        <AlertDescription>{phoneHelp[role]}</AlertDescription>
                      </Alert>
                    }
                  />
                  <FormField
                    id="email"
                    name="email"
                    label="E-mail"
                    type="email"
                    autoComplete="email"
                    placeholder="exemplo@email.com"
                    error={fieldErrors.email}
                  />
                  <FormField
                    id="password"
                    name="password"
                    label="Senha"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Pelo menos 8 caracteres"
                    error={fieldErrors.password}
                  />
                  {formError && (
                    <Alert variant="destructive">
                      <AlertDescription>{formError}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" size="lg" disabled={submitting}>
                    Criar conta
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="apoio flex items-center justify-center gap-1 text-muted-foreground">
              <span>Já tem conta?</span>
              <Link href="/sign-in" className="flex min-h-11 items-center px-1 font-bold text-secondary-foreground">
                Entrar
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
