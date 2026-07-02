import { defineConfig } from 'vite'

export default defineConfig({
  base: '/phonogramm/',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
