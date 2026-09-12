import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { version } from './package.json'

export default defineConfig({
  // GitHub Pages serves a project site from /<repo>/; a custom domain would make this '/'.
  base: '/kamargin/',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'kamargin-html-version',
      transformIndexHtml: (html) => html.replaceAll('%APP_VERSION%', version),
    },
  ],
  define: { __APP_VERSION__: JSON.stringify(version) },
  resolve: {
    // Root-relative: keeps the config free of node:path and @types/node.
    alias: { '@': '/src' },
  },
})
