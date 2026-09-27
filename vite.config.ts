/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    port: 4173,
    strictPort: true,
    open: false,
    proxy: {
      '/api/game-service': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api/report-service': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api/game-results': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ['**/artifacts/**', '**/.visual-check/**', '**/dist/**'],
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['artifacts/**', 'node_modules/**', 'dist/**'],
    testTimeout: 15000,
  },
})
