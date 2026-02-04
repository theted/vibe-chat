import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "socket-vendor": ["socket.io-client"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "socket.io-client"],
  },
  server: {
    port: 3000,
    host: "0.0.0.0", // Allow external connections
    watch: {
      usePolling: true, // Enable polling for Docker
    },
  },
  preview: {
    port: 3000,
    host: "0.0.0.0",
  },
});
