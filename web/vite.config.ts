import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the export works from any static host, gateway subpath or ENS name.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false,
  },
})
