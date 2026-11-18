import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { resolve } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const TASKPANE_DEV_SCRIPT = '<script type="module" src="/src/main.tsx"></script>';

// The Outlook manifest deployed by tenant admins points at
// /outlook/taskpane.html, which runs the web app's own build in embedded
// mode. It is not a build input: a second input sharing the app makes the
// bundler split every route into chunks that the web app then preloads
// (about +130 KiB gzip on its first load). Instead the built page takes the
// web page's asset tags, which also leaves out the web page's /config.js.
function outlookTaskpanePage() {
  return {
    name: "outlook-taskpane-page",
    apply: "build",
    writeBundle(options) {
      const outDir = options.dir;
      const assetTags =
        readFileSync(resolve(outDir, "index.html"), "utf8").match(
          /<(?:script|link)\b[^>]*"\/assets\/[^"]+"[^>]*>(?:<\/script>)?/g,
        ) ?? [];
      const page = readFileSync(
        resolve(import.meta.dirname, "outlook/taskpane.html"),
        "utf8",
      );
      if (!page.includes(TASKPANE_DEV_SCRIPT) || assetTags.length === 0) {
        throw new Error("outlook/taskpane.html: cannot add the app's assets");
      }
      mkdirSync(resolve(outDir, "outlook"), { recursive: true });
      writeFileSync(
        resolve(outDir, "outlook/taskpane.html"),
        page.replace(TASKPANE_DEV_SCRIPT, assetTags.join("\n    ")),
      );
    },
  };
}

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
    outlookTaskpanePage(),
  ],
  build: {
    // The sign-in dialog's last page is a separate entry without the app;
    // the task pane is written by outlookTaskpanePage.
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        outlookDialog: resolve(import.meta.dirname, "outlook/dialog.html"),
      },
    },
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
    // Node 25+ defines its own global localStorage (undefined without
    // --localstorage-file), which shadows jsdom's. The flag is valid on 24 too.
    execArgv: ["--no-experimental-webstorage"],
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
});
