import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: { port: 5180 },
  // The bundle is mostly course text, so a larger single chunk is expected.
  build: { chunkSizeWarningLimit: 900 },
})
