import { resolve } from "node:path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/outlook/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
  build: {
    sourcemap: "hidden",
    rolldownOptions: {
      input: ["taskpane.html", "dialog.html", "events.html"].map((page) =>
        resolve(import.meta.dirname, page),
      ),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    execArgv: ["--no-experimental-webstorage"],
  },
});
