"use client"

// Provisória (DEC-043): sem desenho próprio, usa a moldura da Tela 2. Estática, sem hook.
import Link from "next/link"
import { Info } from "lucide-react"

import { BackHeader } from "@/components/back-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background">
      <main className="flex flex-1 flex-col gap-6 px-4 pt-4 pb-8">
        <BackHeader title="Esqueci a senha" />
        <Alert>
          <Info />
          <AlertDescription>
            A recuperação de senha chega com o login de verdade. Por enquanto, use as contas de demonstração.
          </AlertDescription>
        </Alert>
        <Button asChild size="lg" className="w-full">
          <Link href="/sign-in">Voltar para Entrar</Link>
        </Button>
      </main>
    </div>
  )
}
