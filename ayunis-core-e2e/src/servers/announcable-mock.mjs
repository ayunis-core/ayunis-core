import { createServer } from "node:http";
import process from "node:process";
import { URL } from "node:url";

// Stands in for https://release-notes.locaboo.de, so an e2e backend with an
// Announcable org ID (ANNOUNCABLE_URL) never reads the live feed.
const port = Number(process.env.E2E_ANNOUNCABLE_PORT ?? 3198);

// Keep in sync with E2E_ANNOUNCABLE_NOTE_ID in tests/notifications/release-notes.spec.ts.
const notes = [
  {
    id: "e2e0c0de-7a2b-4c1d-9e8f-1a2b3c4d5e6f",
    title: "Release notes jetzt im Posteingang",
    date: "07.11.2026",
    imageSrc: "",
    media_link: "",
    text: "Neuigkeiten zu Ayunis erscheinen ab sofort als Benachrichtigung.",
    last_update_on: "2026-11-07 12:00:00.000000 +0000 UTC",
    cta_label_override: "",
    cta_href_override: "",
    hide_cta: false,
    attentionMechanism: "instant_open",
  },
];

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  if (request.method === "GET" && url.pathname === "/health") {
    return sendJson(response, 200, { status: "ok" });
  }
  // Like Announcable, every page past the last repeats the last page.
  if (
    request.method === "GET" &&
    url.pathname.startsWith("/api/release-notes/") &&
    url.searchParams.get("for") === "widget"
  ) {
    return sendJson(response, 200, { data: notes });
  }
  return sendJson(response, 404, { message: "Not found" });
});

server.listen(port, "127.0.0.1");

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}
