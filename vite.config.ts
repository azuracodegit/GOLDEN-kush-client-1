import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/GOLDEN-kush-client-1/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
}) 