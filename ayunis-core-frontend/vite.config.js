import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { resolve } from "node:path";

// Get port from environment or use default
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({
      autoCodeSplitting: true,
      routesDirectory: "src/app/routes",
      generatedRouteTree: "src/app/routeTree.gen.ts",
    }),
    viteReact(),
    tailwindcss(),
  ],
  build: {
    // Emit sourcemaps without referencing them from the bundles. The maps
    // never ship (the Dockerfile deletes them); CI uploads them to AppSignal
    // keyed by revision (see the sourcemaps job in build-images.yml).
    sourcemap: "hidden",
  },
  server: {
    port: port,
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
