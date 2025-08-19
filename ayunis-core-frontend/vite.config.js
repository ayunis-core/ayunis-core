import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { resolve } from "node:path";

// Get port from environment or use default
const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;

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
