import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '../..')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: [resolve(projectRoot, 'test/frontend/setup.ts')],
    include: [resolve(projectRoot, 'test/frontend/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}')],
    exclude: ['node_modules', 'dist', 'build', '.vitest'],
  },
})
