import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['cannabis.svg', 'icon-192x192.png', 'icon-512x512.png'],
      manifest: {
        name: 'Golden Kush - Suivi Client',
        short_name: 'Golden Kush',
        description: 'Application de suivi client pour Golden Kush',
        theme_color: '#10b981',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  optimizeDeps: {
    include: ['lucide-react']
  },
  build: {
    commonjsOptions: {
      include: [/lucide-react/, /node_modules/]
    },
    sourcemap: true
  },
  server: {
    port: 5173,
    host: true
  }
});