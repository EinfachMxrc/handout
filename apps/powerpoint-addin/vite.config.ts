import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";

export default defineConfig({
  plugins: [
    react(),
    // HTTPS is required for Office Add-ins in production
    // For local dev, use mkcert; for sideloading, ensure HTTPS
    mkcert(),
  ],
  server: {
    port: 3001,
    host: true,
  },
  build: {
    outDir: "dist",
  },
});
