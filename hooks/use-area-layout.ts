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
    let operatorId: string | null = null
    const recount = () => {
      if (operatorId) countPendingRequests(operatorId).then((n) => active && setPendingRequests(n))
    }
    if (role === "operator") window.addEventListener(PENDING_REQUESTS_CHANGED, recount)
    getCurrentAccount()
      .then(async (account) => {
        if (!account || account.role !== role) {
          router.replace("/sign-in")
          return
        }
        if (account.role === "operator") operatorId = account.id
        const pending = operatorId ? await countPendingRequests(operatorId) : 0
        if (!active) return
        setPendingRequests(pending)
        setStatus("allowed")
      })
      .catch(() => router.replace("/sign-in"))
    return () => {
      window.removeEventListener(PENDING_REQUESTS_CHANGED, recount)
      active = false
      // Activity hides the area by running this cleanup: back to the start so the next
      // account never sees, not even for one frame, the previous badge or data.
      setStatus("checking")
      setPendingRequests(0)
    }
  }, [role, router])

  return { status, pendingRequests }
}

export const PENDING_REQUESTS_CHANGED = "vandi:pending-requests-changed"

/** Tela 5 calls it after accepting or declining: the operator bar recounts its badge. */
export function notifyPendingRequestsChanged(): void {
  window.dispatchEvent(new Event(PENDING_REQUESTS_CHANGED))
}
