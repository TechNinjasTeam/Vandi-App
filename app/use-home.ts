"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getInitialPath } from "@/services/session"

export function useHome() {
  const router = useRouter()

  useEffect(() => {
    getInitialPath().then((path) => router.replace(path))
  }, [router])
}
