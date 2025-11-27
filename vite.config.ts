// vite.config.ts (root, ekki inni í client/)

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  // Láttu Vite vita að kóðinn sé í client/
  root: path.resolve(__dirname, "client"),

  // Static public möppan
  publicDir: path.resolve(__dirname, "client/public"),

  // Byggt út í client/dist
  build: {
    outDir: path.resolve(__dirname, "client/dist"),
    emptyOutDir: true,
  },

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
    },
  },

  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true, // leyfir Replit dómenn að tengjast
    proxy: {
      "/api": { target: "http://localhost:5000", changeOrigin: true },
      "/uploads": { target: "http://localhost:5000", changeOrigin: true },
    },
  },
});
