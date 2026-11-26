import { createServer } from "node:http";
import process from "node:process";
import { URL } from "node:url";

// Stands in for the Ayunis Core Marketplace (MARKETPLACE_SERVICE_URL), so the
// Marketplace entry points are enabled in e2e without reaching the live
// catalogue. It has no pre-installed skills, so new users start without any.
const port = Number(process.env.E2E_MARKETPLACE_PORT ?? 3197);

// Keep in sync with MARKETPLACE_SKILL in tests/skills/marketplace-install-permission.spec.ts
// and tests/marketplace/empty-state-suggestions.spec.ts.
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
    suggested: true,
    published: true,
    preInstalled: false,
    createdAt: "2026-11-09T09:00:00.000Z",
    updatedAt: "2026-11-09T09:00:00.000Z",
  },
];

// Keep in sync with tests/routines/marketplace-install.spec.ts,
// tests/marketplace/empty-state-suggestions.spec.ts and
// tests/routines/marketplace-search.spec.ts.
const ROUTINE_UNAVAILABLE = "e2e-marketplace-down";
const routines = [
  routine({
    identifier: "e2e-amtsblatt",
    name: "Amtsblatt prüfen",
    shortDescription: "Meldet neue Bekanntmachungen im Amtsblatt.",
    prompt: "Prüfe das Amtsblatt auf neue Bekanntmachungen.",
    internetAccess: "allowlist",
    allowedDomains: ["recht.nrw.de", "amtsblatt.example.de"],
    suggested: true,
  }),
  routine({
    identifier: "e2e-ip-domain",
    name: "Intranet prüfen",
    shortDescription: "Liest eine Seite im Intranet.",
    prompt: "Prüfe die Intranetseite.",
    internetAccess: "allowlist",
    allowedDomains: ["192.168.10.20"],
  }),
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
  // The catalogue lists behind the chat's marketplace_search, one page each.
  const list = catalogueLists()[url.pathname];
  if (list) {
    return sendJson(response, 200, list);
  }
  const routineMatch = /^\/api\/routines\/([^/]+)$/.exec(url.pathname);
  if (routineMatch) {
    const identifier = decodeURIComponent(routineMatch[1]);
    if (identifier === ROUTINE_UNAVAILABLE) {
      return sendJson(response, 500, { message: "Internal server error" });
    }
    const entry = routines.find((item) => item.identifier === identifier);
    return entry
      ? sendJson(response, 200, { ...entry, schedule: anHourAgoWeekly() })
      : sendJson(response, 404, { message: "Not found" });
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

function catalogueLists() {
  return {
    "/api/skills": page(skills),
    "/api/skill-categories": [],
    "/api/integrations": page([]),
    "/api/routines": page(
      routines.map((entry) => ({ ...entry, schedule: anHourAgoWeekly() })),
    ),
    "/api/routine-categories": [],
  };
}

function page(data) {
  return { data, total: data.length, page: 1, limit: 100, totalPages: 1 };
}

function routine(fields) {
  return {
    id: "6a2f9c1e-3b4d-4e5f-8a7b-9c0d1e2f3a4b",
    description: null,
    routineCategoryId: null,
    iconName: "newspaper",
    featured: false,
    suggested: false,
    published: true,
    useCases: [],
    benefits: [],
    exampleNotification: null,
    providerName: null,
    providerLogoUrl: null,
    providerWebsiteUrl: null,
    metaTitle: null,
    metaDescription: null,
    installCount: 0,
    createdAt: "2026-11-09T09:00:00.000Z",
    updatedAt: "2026-11-09T09:00:00.000Z",
    ...fields,
  };
}

// Weekly on every day, an hour ago in Berlin: an installed routine's next run
// is then about a day away, so no scheduled run starts during the tests.
function anHourAgoWeekly() {
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(Date.now() - 60 * 60 * 1000));
  return { frequency: "weekly", time, weekdays: [1, 2, 3, 4, 5, 6, 7] };
}
