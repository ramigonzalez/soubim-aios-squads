/**
 * Promem landing page (README §10): a static page, separate from the app bundle,
 * built from the app's design system.
 *
 * - `index.html` is the template. At build (and dev) time the `prerender` plugin
 *   loads `render.tsx` through Vite's SSR loader and puts the React markup in
 *   place of `<!--landing-->`. No React runtime reaches the browser.
 * - `client.ts` is the only script: the contact form (mode switch, mask,
 *   validation, submission). The FAQ is native <details>.
 * - CSS goes through the app's Tailwind config + Promem preset, so tokens and
 *   classes match the app exactly.
 *
 * npm run landing:build → dist-landing/ · npm run landing:dev → http://localhost:5174
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import autoprefixer from 'autoprefixer'
import tailwindcss from 'tailwindcss'
import { createServer, defineConfig, type Plugin, type ViteDevServer } from 'vite'

const landingDir = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(landingDir, '..')

const css = {
  postcss: {
    plugins: [tailwindcss({ config: path.join(landingDir, 'tailwind.config.ts') }), autoprefixer()],
  },
}

/** Server-renders `render.tsx` into the HTML template (static markup, no hydration). */
function prerender(): Plugin {
  let devServer: ViteDevServer | undefined
  return {
    name: 'promem-landing-prerender',
    configureServer(server) {
      devServer = server
    },
    async transformIndexHtml(html) {
      const server =
        devServer ??
        (await createServer({
          configFile: false,
          root: landingDir,
          envDir: frontendDir,
          logLevel: 'error',
          appType: 'custom',
          server: { middlewareMode: true, hmr: false },
          plugins: [react()],
          css,
        }))
      try {
        const { render } = (await server.ssrLoadModule('/render.tsx')) as { render: () => string }
        return html.replace('<!--landing-->', render())
      } finally {
        if (!devServer) await server.close()
      }
    },
  }
}

export default defineConfig({
  root: landingDir,
  // Same .env files and VITE_API_BASE_URL as the app.
  envDir: frontendDir,
  publicDir: path.join(landingDir, 'public'),
  plugins: [react(), prerender()],
  css,
  server: {
    port: 5174,
    proxy: {
      '/api': {
        // Dev only: the default base URL "/api" goes to the local backend.
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.join(frontendDir, 'dist-landing'),
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: 0,
  },
})
