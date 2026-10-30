// Vandi · cofre: Design System/Código/components/theme-provider.tsx
// Liga o tema claro/escuro pela classe "dark" no <html> (next-themes, como manda o shadcn).
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
