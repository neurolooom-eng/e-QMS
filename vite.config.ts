import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Project pages are served from https://<user>.github.io/e-QMS/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/e-QMS/' : '/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: true, port: 5173 },
}))
