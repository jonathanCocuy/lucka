import type { NextConfig } from 'next'

// Export estático: Tauri sirve `out/` como archivos, sin servidor.
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // `/settings/index.html`: el webview resuelve carpetas, no rutas sin extensión.
  trailingSlash: true,
}

export default nextConfig
