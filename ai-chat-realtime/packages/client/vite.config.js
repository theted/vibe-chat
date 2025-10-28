import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0', // Allow external connections
    watch: {
      usePolling: true, // Enable polling for Docker
    },
  },
  preview: {
    port: 3000,
    host: '0.0.0.0'
  }
})