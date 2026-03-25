import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '../..')

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@testing-library/react': resolve(__dirname, 'node_modules/@testing-library/react'),
      '@testing-library/user-event': resolve(__dirname, 'node_modules/@testing-library/user-event'),
      '@testing-library/jest-dom': resolve(__dirname, 'node_modules/@testing-library/jest-dom'),
      'react': resolve(__dirname, 'node_modules/react'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-dev-runtime': resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: [resolve(projectRoot, 'test/frontend/setup.ts')],
    include: ['../../test/frontend/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'build', '.vitest'],
    deps: {
      inline: ['react', 'react-dom', 'zustand', '@testing-library/react', '@testing-library/user-event', '@testing-library/jest-dom'],
    },
  },
})
