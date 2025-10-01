import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    css: true,
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
    // Suppress act warnings for cleaner test output
    silent: false,
    // Add coverage if needed
    // coverage: {
    //   provider: 'v8',
    //   reporter: ['text', 'json', 'html'],
    //   exclude: ['node_modules/', 'tests/', '**/*.test.*', '**/*.spec.*']
    // }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
  css: {
    postcss: './postcss.config.mjs',
  },
  // Use ESM for better compatibility
  esbuild: {
    target: 'node14'
  }
})
