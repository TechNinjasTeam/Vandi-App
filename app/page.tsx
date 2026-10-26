"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useHome } from "./use-home"

export default function Home() {
  useHome()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background">
      <div className="flex flex-col gap-4 px-4 pt-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}
