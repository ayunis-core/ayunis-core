import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const webRoot = resolve(import.meta.dirname, "../../ayunis-core-frontend");
const outlookRoot = resolve(webRoot, "outlook");
const pages = ["dialog.html", "events.html"];
const paneEntry = '<script type="module" src="/src/main.tsx"></script>';

function outlookPages() {
  return {
    name: "outlook-pages",
    writeBundle({ dir }) {
      for (const page of pages) {
        renameSync(resolve(dir, "outlook", page), resolve(dir, page));
      }

      // The pane still boots the embedded web app until AYC-1956. Reuse its
      // build tags so the pane has the same app without adding a web input.
      const assetTags = readFileSync(resolve(webRoot, "dist/index.html"), "utf8")
        .match(/<(?:script|link)\b[^>]*"\/assets\/[^"]+"[^>]*>(?:<\/script>)?/g);
      const pane = readFileSync(resolve(outlookRoot, "taskpane.html"), "utf8");
      if (!pane.includes(paneEntry) || !assetTags?.length) {
        throw new Error("Cannot attach the web build to the Outlook task pane");
      }
      writeFileSync(
        resolve(dir, "taskpane.html"),
        pane.replace(paneEntry, assetTags.join("\n    ")),
      );
    },
  };
}

export default defineConfig({
  root: webRoot,
  base: "/outlook/",
  publicDir: resolve(webRoot, "public/outlook"),
  plugins: [outlookPages()],
  resolve: {
    alias: { "@": resolve(webRoot, "src") },
  },
  build: {
    outDir: resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    rolldownOptions: {
      input: pages.map((page) => resolve(outlookRoot, page)),
    },
  },
});
