import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        // The CJS icon entries double-wrap their default export under Vite; the ESM build is safe.
        find: /^@mui\/icons-material\/(?!esm\/)(.+)$/,
        replacement: '@mui/icons-material/esm/$1',
      },
    ],
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    restoreMocks: true,
    unstubGlobals: true,
    clearMocks: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/*.d.ts',
        'src/index.tsx',
        'src/reportWebVitals.ts',
      ],
    },
  },
})
