#!/usr/bin/env node
import { appendFileSync, readFileSync } from "node:fs";
import process from "node:process";

export const ALL_SCREENSHOT_ROUTES = [
  "chat",
  "chat-conversation",
  "chat-project-context",
  "workspace-project-context",
  "admin-users",
  "admin-instructions",
  "settings-account",
];

const ROUTE_MAPPINGS = [
  {
    files: [
      "ayunis-core-frontend/src/pages/chat/hooks/useWorkspaceContextPanel.ts",
      "ayunis-core-frontend/src/pages/chat/ui/ChatHeader.tsx",
      "ayunis-core-frontend/src/pages/chat/ui/ChatPage.tsx",
      "ayunis-core-frontend/src/pages/chat/ui/WorkspaceContextHeaderActions.tsx",
      "ayunis-core-frontend/src/pages/chat/ui/WorkspaceContextSidePanel.tsx",
    ],
    routes: ["chat-project-context"],
  },
  {
    prefixes: [
      "ayunis-core-frontend/src/pages/chat/",
      "ayunis-core-frontend/src/pages/chats/",
      "ayunis-core-frontend/src/pages/new-chat/",
    ],
    routes: ["chat", "chat-conversation", "chat-project-context"],
  },
  {
    prefixes: [
      "ayunis-core-frontend/src/pages/workspace/",
      "ayunis-core-frontend/src/pages/workspaces/",
      "ayunis-core-frontend/src/widgets/workspace-document-status/",
    ],
    files: [
      "ayunis-core-frontend/src/app/routes/_authenticated/workspaces.$workspaceId.tsx",
      "ayunis-core-frontend/src/app/routes/_authenticated/workspaces.index.tsx",
    ],
    routes: ["workspace-project-context", "chat-project-context"],
  },
  {
    prefixes: ["ayunis-core-frontend/src/pages/admin-settings/users-settings/"],
    files: [
      "ayunis-core-frontend/src/app/routes/_authenticated/admin-settings.users.tsx",
    ],
    routes: ["admin-users"],
  },
  {
    prefixes: [
      "ayunis-core-frontend/src/pages/admin-settings/instructions-settings/",
    ],
    files: [
      "ayunis-core-frontend/src/app/routes/_authenticated/admin-settings.instructions.tsx",
    ],
    routes: ["admin-instructions"],
  },
  {
    prefixes: ["ayunis-core-frontend/src/pages/settings/account-settings/"],
    files: [
      "ayunis-core-frontend/src/app/routes/_authenticated/settings.account.tsx",
    ],
    routes: ["settings-account"],
  },
];

const GLOBAL_FRONTEND_PREFIXES = [
  "ayunis-core-frontend/src/shared/",
  "ayunis-core-frontend/src/widgets/",
  "ayunis-core-frontend/src/features/",
  "ayunis-core-frontend/src/styles/",
  "ayunis-core-frontend/src/app/",
  "ayunis-core-frontend/public/",
  "packages/ui/",
];

const GLOBAL_FRONTEND_FILES = [
  "ayunis-core-frontend/index.html",
  "ayunis-core-frontend/package.json",
  "ayunis-core-frontend/vite.config.ts",
  "ayunis-core-frontend/vite.config.mts",
  "pnpm-lock.yaml",
];

function normalizePath(file) {
  return file.trim().replace(/^\.\//, "");
}

function hasPrefix(file, prefixes) {
  return prefixes.some((prefix) => file.startsWith(prefix));
}

function mappedRoutesFor(file) {
  for (const mapping of ROUTE_MAPPINGS) {
    if (
      mapping.files?.includes(file) ||
      hasPrefix(file, mapping.prefixes ?? [])
    ) {
      return mapping.routes;
    }
  }
  return null;
}

function isGlobalFrontendChange(file) {
  return (
    GLOBAL_FRONTEND_FILES.includes(file) ||
    hasPrefix(file, GLOBAL_FRONTEND_PREFIXES)
  );
}

function isFrontendChange(file) {
  return (
    file.startsWith("ayunis-core-frontend/") || file.startsWith("packages/ui/")
  );
}

export function selectScreenshotRoutes(files) {
  const normalizedFiles = files.map(normalizePath).filter(Boolean);
  const frontendFiles = normalizedFiles.filter(isFrontendChange);

  if (frontendFiles.length === 0) {
    return { frontendChanged: false, routes: [] };
  }

  const selectedRoutes = new Set();
  let hasGlobalFrontendChange = false;
  for (const file of frontendFiles) {
    const routes = mappedRoutesFor(file);
    if (routes) {
      routes.forEach((route) => selectedRoutes.add(route));
      continue;
    }

    if (
      isGlobalFrontendChange(file) ||
      file.startsWith("ayunis-core-frontend/")
    ) {
      hasGlobalFrontendChange = true;
    }
  }

  const routes = selectedRoutes.size
    ? ALL_SCREENSHOT_ROUTES.filter((route) => selectedRoutes.has(route))
    : ALL_SCREENSHOT_ROUTES;

  return {
    frontendChanged: true,
    routes: hasGlobalFrontendChange || selectedRoutes.size > 0 ? routes : [],
  };
}

function readFilesFromArgs(args) {
  const fromFileIndex = args.indexOf("--from-file");
  if (fromFileIndex >= 0) {
    const filePath = args[fromFileIndex + 1];
    if (!filePath) {
      throw new Error("--from-file requires a path");
    }
    return readFileSync(filePath, "utf8").split("\n");
  }
  return args;
}

function writeGithubOutput(result) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;

  appendFileSync(
    outputPath,
    `frontend_changed=${String(result.frontendChanged)}\n` +
      `routes=${result.routes.join(",")}\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = selectScreenshotRoutes(
    readFilesFromArgs(process.argv.slice(2)),
  );
  writeGithubOutput(result);
  process.stdout.write(`frontend_changed=${String(result.frontendChanged)}\n`);
  process.stdout.write(`routes=${result.routes.join(",")}\n`);
}
