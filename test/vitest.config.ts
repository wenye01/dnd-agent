import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@': resolve(__dirname, '../apps/web/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'build', '.vitest'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
})
