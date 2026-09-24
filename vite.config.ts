/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180.png'],
      manifest: {
        name: 'Nextuss — Centro de mando',
        short_name: 'Nextuss',
        description: 'Centro de mando personal: hábitos, planificación, captura y estadísticas, todo local y sin conexión.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        categories: ['productivity', 'lifestyle'],
        theme_color: '#0B0E14',
        background_color: '#0B0E14',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Hoy', url: '/', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
          {
            name: 'Captura rápida',
            url: '/?action=capture',
            icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
          },
          { name: 'Enfoque', url: '/?action=focus', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
          {
            name: 'Estadísticas',
            url: '/estadisticas',
            icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
          },
        ],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        // Vendor estable: react/router casi nunca cambian, así que su chunk (y su caché) sobrevive
        // a los despliegues de código de la app. Recharts y el SDK de Anthropic ya quedan aparte
        // solo por venir de `import()` dinámicos.
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[/\\](react|react-dom|react-router|react-router-dom|scheduler)[/\\]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
  test: {
    setupFiles: ['./src/test/setup.ts'],
  },
})
