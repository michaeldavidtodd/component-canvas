/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Tauri sets this when developing against a physical device; unused on desktop.
const host = process.env.TAURI_DEV_HOST;
const isDebug = process.env.TAURI_ENV_DEBUG === "true";
// The desktop wrapper picks a free port and passes it here. Plain `npm run dev`
// leaves it unset so Vite can fall back to the next free port on its own.
const devPort = Number(process.env.TAURI_DEV_PORT) || 8080;
const hasFixedDevPort = Boolean(process.env.TAURI_DEV_PORT);

// https://vitejs.dev/config/
export default defineConfig(() => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Tauri manages its own terminal output.
  clearScreen: false,
  server: {
    host: host || "::",
    port: devPort,
    // The desktop wrapper already found a free port, so fail fast if it's taken.
    // Plain web dev lets Vite move to the next free port instead.
    strictPort: hasFixedDevPort,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: {
      // Rust sources are rebuilt by Tauri, not Vite.
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: {
    // Match the webviews Tauri targets: WKWebView (Safari) on macOS, WebView2 (Chromium) on Windows.
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: isDebug ? false : ("esbuild" as const),
    sourcemap: isDebug,
  },
  // Vitest runs the pure-logic tests (parent rules, token validation, document
  // snapshots) and server-rendered component tests in Node. It shares the alias
  // above so tests import through `@/`.
  test: {
    environment: "node",
    // Edge-function code lives outside src/ but its pure modules are tested here.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "supabase/**/*.test.ts"],
  },
}));
