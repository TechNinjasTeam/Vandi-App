import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // App só client-side: a guarda de papel segura as páginas até conferir a sessão; valida só segmento com `instant` explícito.
  experimental: { instantInsights: { validationLevel: "manual-warning" } },
};

export default nextConfig;
