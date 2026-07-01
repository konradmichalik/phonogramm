import { defineConfig } from 'vite'

export default defineConfig({
  base: '/hoerspiel-quiz/',
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        storageQuota: 10000000,
      },
    },
  },
})
