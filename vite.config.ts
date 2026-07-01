import { defineConfig } from 'vite'

export default defineConfig({
  base: '/hoerspiel-quiz/',
  test: { globals: true, environment: 'jsdom' },
})
