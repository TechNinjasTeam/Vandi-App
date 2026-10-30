"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { getInitialPath } from "@/services/session"

// Quem já entrou não vê /sign-in nem /sign-up: vai para o caminho inicial do papel.
// Devolve true enquanto checa (Skeleton no servidor e no primeiro paint do cliente).
// O efeito roda de novo quando o Activity mostra a rota outra vez.
export function useRedirectIfSignedIn(): boolean {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    getInitialPath()
      .then((path) => {
        if (path === "/sign-in") setChecking(false)
        else router.replace(path)
      })
      .catch(() => setChecking(false))
  }, [router])

  return checking
}
