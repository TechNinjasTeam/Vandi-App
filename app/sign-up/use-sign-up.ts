"use client"

// CAMADA 2 · HOOK. Só guarda o estado da tela e chama o service.
import { useState } from "react"
import { useRouter } from "next/navigation"

import { useRedirectIfSignedIn } from "@/hooks/use-redirect-if-signed-in"
import { getInitialPath, signUp } from "@/services/session"
import type { Role, SignUpFieldErrors } from "@/types"

export function useSignUp() {
  const router = useRouter()
  const checking = useRedirectIfSignedIn()
  const [role, setRole] = useState<Role>("student")
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<SignUpFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // currentTarget some depois do 1º await
    const form = event.currentTarget
    const data = new FormData(form)
    setSubmitting(true)
    setFieldErrors({})
    setFormError(null)
    try {
      const result = await signUp({
        role,
        name: String(data.get("name")),
        phone: String(data.get("phone")),
        email: String(data.get("email")),
        password: String(data.get("password")),
      })
      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
        else setFormError(result.error)
        return
      }
      // O Activity guarda o formulário entre navegações: zera no sucesso.
      form.reset()
      setRole("student")
      router.replace(await getInitialPath())
    } catch {
      setFormError("Não deu para salvar agora. Tente de novo.")
    } finally {
      setSubmitting(false)
    }
  }

  return { checking, role, setRole, submitting, fieldErrors, formError, submit }
}
