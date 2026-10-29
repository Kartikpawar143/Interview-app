import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

const animeResolver: Plugin = {
  name: 'animejs-offline-fallback',
  enforce: 'pre',
  async resolveId(source, importer) {
    if (source !== 'animejs') return null
    const installed = await this.resolve(source, importer, { skipSelf: true })
    if (installed) return installed
    const sourceRoot = importer?.slice(0, importer.lastIndexOf('/src/'))
    return sourceRoot ? `${sourceRoot}/src/lib/animeFallback.ts` : null
  },
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  return {
    plugins: [react(), animeResolver],
    server: { proxy: { '/api': env.VITE_API_PROXY ?? 'http://127.0.0.1:8000' } },
  }
})
