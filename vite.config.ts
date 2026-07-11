import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 3000,
    strictPort: true,
  },
  optimizeDeps: {
    // Scan both webview entry pages at server start so all dependencies are
    // pre-bundled upfront. Discovering a dep mid-session (e.g. one only
    // imported by broadcast-output) re-optimizes the chunks and leaves open
    // webviews holding a stale React copy — which crashes rendering with
    // "null is not an object (evaluating 'dispatcher.useContext')".
    entries: ["index.html", "broadcast-output.html"],
  },
  build: {
    outDir: "build",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        broadcast: path.resolve(__dirname, "broadcast-output.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
