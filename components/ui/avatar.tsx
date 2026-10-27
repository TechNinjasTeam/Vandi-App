// Vandi · cofre: Design System/Código/components/ui/avatar.tsx (copiar 1:1, não editar à mão)
// Iniciais num círculo. tone="inverse" (listas) ou "highlight" (lima: motorista, quem confirmou).
"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  size = "default",
  tone = "inverse",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "sm" | "lg" // 44 · 32 · 48 px
  tone?: "inverse" | "highlight"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      data-tone={tone}
      className={cn(
        "group/avatar relative flex size-11 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-12 data-[size=sm]:size-8",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-inverse text-base font-black text-inverse-foreground group-data-[size=sm]/avatar:text-sm group-data-[tone=highlight]/avatar:bg-highlight group-data-[tone=highlight]/avatar:text-highlight-foreground",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-card",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup }
