import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Root-relative: keeps the config free of node:path and @types/node.
    alias: { '@': '/src' },
  },
})
