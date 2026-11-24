import { cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const workspace = resolve(import.meta.dirname, "../../../..");
const appsPath = join(workspace, "apps");
const outputPath = join(workspace, "ayunis-core-backend", "frontend");
const webDist = join(workspace, "ayunis-core-frontend", "dist");
const apps = readdirSync(appsPath, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

rmSync(outputPath, { recursive: true, force: true });
mkdirSync(outputPath, { recursive: true });
cpSync(webDist, join(outputPath, "web"), {
  recursive: true,
  // Outlook still keeps its public files in the web publicDir for dev.
  filter: (source) => source !== join(webDist, "outlook"),
});
for (const app of apps) {
  cpSync(join(appsPath, app, "dist"), join(outputPath, app), { recursive: true });
}
