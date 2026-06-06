// vite.config.js
// Vite is the build tool / dev server (replaces Streamlit's built-in server).
// The React plugin handles JSX → JS transpilation automatically.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    port: 8080,      // UI runs on :8080, same port as the old Streamlit UI
    proxy: {
      // Forward /api/* requests to FastAPI so you avoid CORS issues in dev.
      // e.g. fetch("/api/predict") → http://localhost:8001/predict
      "/api": {
        target: "http://127.0.0.1:8001",   // 127.0.0.1 = IPv4 explicitly
        changeOrigin: true,                 // localhost on Windows resolves to
        secure: false,                      // ::1 (IPv6) but uvicorn only binds
        rewrite: (path) => path.replace(/^\/api/, ""),  // IPv4 → socket hang up
      },
    },
  },

  build: {
    outDir: "dist",   // `npm run build` output folder (for production deploy)
  },
});