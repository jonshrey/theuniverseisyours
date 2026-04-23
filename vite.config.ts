import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import comlink from 'vite-plugin-comlink'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    comlink()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    plugins: () => [comlink()]  // Important for Worker bundling
  }
})