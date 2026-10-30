// Vandi · cofre: Design System/Código/components/ui/sonner.tsx (copiar 1:1, não editar à mão)
// Aviso rápido escuro, no topo, igual nos dois temas. Uso: toast.success("Link copiado")
"use client"

import {
  CheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      offset={16}
      mobileOffset={16}
      className="toaster group"
      icons={{
        success: <CheckIcon className="size-5 text-highlight" strokeWidth={2.5} />,
        info: <InfoIcon className="size-5" />,
        warning: <TriangleAlertIcon className="size-5" />,
        error: <OctagonXIcon className="size-5" />,
        loading: <Loader2Icon className="size-5 animate-spin" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-2.5 rounded-md bg-inverse px-4 py-3.5 font-sans text-sm leading-[1.45] font-bold text-inverse-foreground shadow-drawer",
          icon: "flex size-5 shrink-0 items-center justify-center",
          content: "flex flex-1 flex-col gap-0.5",
          title: "font-bold",
          description: "font-semibold text-inverse-foreground/80",
          actionButton:
            "ml-auto h-11 shrink-0 rounded-sm px-3.5 font-sans text-sm font-black text-highlight",
          cancelButton:
            "h-11 shrink-0 rounded-sm px-3.5 font-sans text-sm font-bold text-inverse-foreground/80",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
