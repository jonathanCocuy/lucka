import type { NextConfig } from 'next'

// Static export: Tauri serves `out/` as plain files, no server.
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // `/settings/index.html`: the webview resolves folders, not extensionless paths.
  trailingSlash: true,
}

export default nextConfig
