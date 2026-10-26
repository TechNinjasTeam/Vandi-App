"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { getToday } from "@/services/clock"
import { getCurrentAccount, restoreDemoData, signOut as endSession } from "@/services/session"
import type { Account } from "@/types"

type ProfileState = { status: "loading" } | { status: "error" } | { status: "ready"; account: Account }

// Estado inicial "loading" igual no servidor e no cliente; a conta só é lida depois de montar.
export function useProfile() {
  const router = useRouter()
  const [state, setState] = useState<ProfileState>({ status: "loading" })
  const [restoring, setRestoring] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    getCurrentAccount()
      .then((account) => {
        if (!account) router.replace("/sign-in")
        else setState({ status: "ready", account })
      })
      .catch(() => setState({ status: "error" }))
  }, [attempt, router])

  const retry = useCallback(() => {
    setState({ status: "loading" })
    setAttempt((n) => n + 1)
  }, [])

  const signOut = useCallback(async () => {
    await endSession()
    router.replace("/sign-in")
  }, [router])

  const restore = useCallback(async () => {
    setRestoring(true)
    const result = await restoreDemoData(getToday())
    setRestoring(false)
    if (result.ok) router.replace("/sign-in")
    else toast.error(result.error)
  }, [router])

  return { state, retry, signOut, restore, restoring }
}
