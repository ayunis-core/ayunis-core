import { createServer } from "node:http";
import process from "node:process";
import { URL } from "node:url";

// Stands in for the Ayunis Core Marketplace (MARKETPLACE_SERVICE_URL), so the
// Marketplace entry points are enabled in e2e without reaching the live
// catalogue. It has no pre-installed skills, so new users start without any.
const port = Number(process.env.E2E_MARKETPLACE_PORT ?? 3197);

// Keep in sync with MARKETPLACE_SKILL in tests/skills/marketplace-install-permission.spec.ts.
const skills = [
  {
    id: "4f1d2c3b-5a6e-4b7c-8d9e-0f1a2b3c4d5e",
    identifier: "e2e-sitzungsprotokoll",
    name: "Sitzungsprotokoll",
    shortDescription: "Erstellt Protokolle aus Sitzungsnotizen.",
    aiDescription: "Use when the user wants minutes from meeting notes.",
    instructions: "Write concise minutes from the meeting notes.",
    skillCategoryId: null,
    iconUrl: null,
    featured: false,
    published: true,
    preInstalled: false,
    createdAt: "2026-11-09T09:00:00.000Z",
    updatedAt: "2026-11-09T09:00:00.000Z",
  },
];

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  if (request.method !== "GET") {
    return sendJson(response, 404, { message: "Not found" });
  }
  if (url.pathname === "/health") {
    return sendJson(response, 200, { status: "ok" });
  }
  if (url.pathname === "/api/skills/pre-installed") {
    return sendJson(response, 200, []);
  }
  const match = /^\/api\/skills\/([^/]+)$/.exec(url.pathname);
  const skill = match
    ? skills.find((entry) => entry.identifier === decodeURIComponent(match[1]))
    : undefined;
  if (skill) {
    return sendJson(response, 200, skill);
  }
  return sendJson(response, 404, { message: "Not found" });
});

server.listen(port, "127.0.0.1");

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}
