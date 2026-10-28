"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { countPendingRequests } from "@/services/enrollments"
import { getCurrentAccount } from "@/services/session"
import type { Role } from "@/types"

// Guarda de papel: sem sessão, papel errado ou falha na leitura → /sign-in, sem mostrar a área.
// Estado inicial "checking" é igual no servidor e no primeiro paint do cliente (hidratação).
export function useAreaLayout(role: Role): { status: "checking" | "allowed"; pendingRequests: number } {
  const router = useRouter()
  const [status, setStatus] = useState<"checking" | "allowed">("checking")
  const [pendingRequests, setPendingRequests] = useState(0)

  useEffect(() => {
    let active = true
    getCurrentAccount()
      .then(async (account) => {
        if (!account || account.role !== role) {
          router.replace("/sign-in")
          return
        }
        const pending = account.role === "operator" ? await countPendingRequests(account.id) : 0
        if (!active) return
        setPendingRequests(pending)
        setStatus("allowed")
      })
      .catch(() => router.replace("/sign-in"))
    return () => {
      active = false
    }
  }, [role, router])

  return { status, pendingRequests }
}

export const PENDING_REQUESTS_CHANGED = "vandi:pending-requests-changed"

/** Tela 5 calls it after accepting or declining: the operator bar recounts its badge. */
export function notifyPendingRequestsChanged(): void {
  window.dispatchEvent(new Event(PENDING_REQUESTS_CHANGED))
}
