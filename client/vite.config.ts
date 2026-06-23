import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

// Read version directly from root package.json — this is the single source of truth
const rootPackageJson = JSON.parse(
  readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8')
)
const APP_VERSION = rootPackageJson.version

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
    // Content-based hashes in filenames → browser always loads new files after update
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  // Inject app version from root package.json into the bundle
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
})
