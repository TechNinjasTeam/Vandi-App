// Vandi · cofre: Design System/Código/app/manifest.ts
// Manifesto do app instalável (PWA). O Next serve em /manifest.webmanifest.
import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vandi",
    short_name: "Vandi",
    description: "A van da faculdade organizada: quem vai, quem volta, sem caçar resposta no grupo.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F8FC",
    theme_color: "#3D5AFE",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
