// Vandi · cofre: Design System/Código/lib/utils.ts
// Exigido pelo shadcn: todo componente de components/ui importa o cn daqui.
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
