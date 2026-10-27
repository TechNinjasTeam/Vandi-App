"use client"

// CAMADA 2 · HOOK da Tela 1. Só guarda o estado do formulário e chama o service.
import { useState } from "react"
import { useRouter } from "next/navigation"

import { useRedirectIfSignedIn } from "@/hooks/use-redirect-if-signed-in"
import { getInitialPath, signIn } from "@/services/session"

export function useSignIn() {
  const router = useRouter()
  const checking = useRedirectIfSignedIn()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  function toggleShowPassword() {
    setShowPassword((value) => !value)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // React zera `currentTarget` quando o handler retorna: guardar antes do primeiro await.
    const form = event.currentTarget
    const data = new FormData(form)
    setSubmitting(true)
    setError(null)
    try {
      const result = await signIn(String(data.get("email") ?? ""), String(data.get("password") ?? ""))
      if (!result.ok) {
        setError(result.error)
        setSubmitting(false)
        return
      }
      // A rota fica viva (Activity) depois do redirecionamento: zera o formulário agora.
      form.reset()
      setShowPassword(false)
      setSubmitting(false)
      router.replace(await getInitialPath())
    } catch {
      setError("Não deu para salvar agora. Tente de novo.")
      setSubmitting(false)
    }
  }

  return { checking, submitting, error, showPassword, toggleShowPassword, submit }
}
