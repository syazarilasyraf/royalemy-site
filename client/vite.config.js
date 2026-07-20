import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Use our own src/sw.js with Workbox injectManifest.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      // We still handle registration manually through registerSW.js / UpdatePrompt.jsx.
      injectRegister: false,
      registerType: 'prompt',
      // The manifest.webmanifest in public/ is copied through by Vite; do not
      // let the plugin generate another one.
      manifest: false,
      // Make sure these public assets are included in the precache manifest.
      includeAssets: ['offline.html', 'royalemy.png'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    allowedHosts: true,
    // Proxy API requests to backend in development mode
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
