/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Configuración de Vite: compila la app, genera el manifest y el service worker (PWA)
// y define el entorno de pruebas de Vitest.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icono.svg'],
      manifest: {
        name: 'Mi Sanfra - Servicios al vecino',
        short_name: 'Mi Sanfra',
        description: 'Servicios municipales de San Francisco en el celular (prototipo académico).',
        lang: 'es-AR',
        theme_color: '#0b3d91',
        background_color: '#f4f6fb',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icono.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icono-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Se precachea la app completa: abre sin conexión.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Los mosaicos del mapa se guardan a medida que se ven (máx. 300, 7 días).
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]?\.?tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mosaicos-mapa',
              expiration: { maxEntries: 300, maxAgeSeconds: 7 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Ionic y Leaflet van en archivos aparte: el navegador los cachea por separado y
        // Leaflet solo se descarga al abrir un mapa. (@ionic/react registra todos sus
        // componentes desde un único punto de entrada, por eso su paquete es grande.)
        manualChunks: {
          ionic: ['@ionic/react', '@ionic/react-router'],
          mapa: ['leaflet', 'react-leaflet'],
        },
      },
    },
    chunkSizeWarningLimit: 1400,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: false,
  },
});
