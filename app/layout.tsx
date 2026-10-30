// Vandi · cofre: Design System/Código/app/layout.tsx
// Layout raiz: lang pt-BR, as duas fontes do Vandi, tema claro/escuro e o aviso rápido (Toaster).
// Tira o Geist que o create-next-app coloca.
import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque, Nunito_Sans } from "next/font/google"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

import "./globals.css"

// Bricolage: títulos, números e botões. "opsz" deixa o desenho certo em cada tamanho.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  axes: ["opsz"],
  display: "swap",
})

// Nunito Sans: todo o resto.
const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
  axes: ["opsz"],
  display: "swap",
})

export const metadata: Metadata = {
  title: { default: "Vandi", template: "%s · Vandi" },
  description: "A van da faculdade organizada: quem vai, quem volta, sem caçar resposta no grupo.",
  applicationName: "Vandi",
  appleWebApp: { capable: true, title: "Vandi", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/vandi-favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon-180.png",
  },
}

// Cor da barra do navegador = background de cada tema (metadata não lê variável CSS).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F8FC" },
    { media: "(prefers-color-scheme: dark)", color: "#0D0F22" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${bricolage.variable} ${nunito.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* Tema: segue o celular. Se o grupo decidir "só claro", troque por defaultTheme="light" enableSystem={false}. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
