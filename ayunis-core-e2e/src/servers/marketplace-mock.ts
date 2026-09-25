import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type {
  IntegrationListResponseDto,
  IntegrationResponseDto,
  PaginatedIntegrationsResponseDto,
  PaginatedSkillsResponseDto,
  SkillCategoryResponseDto,
  SkillListResponseDto,
  SkillResponseDto,
} from "../../../ayunis-core-backend/src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas";

// Contract server for the Ayunis Marketplace public API, used by e2e stacks.
// Mirrors the public list/detail/category endpoints the backend's generated
// marketplace client calls, with a fixed catalogue so specs can assert on
// identifiers. The fixtures are typed with the generated DTOs, so a
// regenerated client that changes a shape fails the e2e typecheck here.
// Node 24 runs this file directly; keep the syntax erasable (no enums).

const port = Number(process.env.E2E_MARKETPLACE_PORT ?? 3299);
const timestamp = "2026-01-01T00:00:00.000Z";
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

const categories: SkillCategoryResponseDto[] = [
  {
    id: "c0000000-0000-4000-8000-000000000001",
    name: "Finanzen",
    description: "Haushalt, Kasse und Rechnungswesen",
    sortOrder: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: "c0000000-0000-4000-8000-000000000002",
    name: "Verwaltung",
    description: null,
    sortOrder: 2,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];

const skills: SkillResponseDto[] = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    identifier: "e2e-finance-clerk-assistant",
    name: "Finanzsachbearbeitung",
    shortDescription:
      "Unterstützt Sachbearbeitende im Finanzbereich bei Haushaltsstellen, Buchungen und Rechnungsprüfung.",
    aiDescription:
      "Activate for municipal finance clerk tasks: budget positions, bookings, invoice checks.",
    instructions:
      "Du unterstützt Sachbearbeitende der Kommunalfinanzen. Frage nach Haushaltsstelle und Buchungsjahr, bevor du Buchungsvorschläge machst.",
    skillCategoryId: categories[0].id,
    iconUrl: null,
    featured: true,
    published: true,
    preInstalled: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: "a0000000-0000-4000-8000-000000000002",
    identifier: "e2e-meeting-minutes",
    name: "Sitzungsprotokoll",
    shortDescription:
      "Erstellt strukturierte Protokolle aus Sitzungsnotizen der Verwaltung.",
    aiDescription:
      "Activate when the user wants meeting notes turned into formal minutes.",
    instructions:
      "Formuliere aus Stichpunkten ein Protokoll mit Tagesordnung, Beschlüssen und Aufgaben.",
    skillCategoryId: categories[1].id,
    iconUrl: null,
    featured: false,
    published: true,
    preInstalled: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: "a0000000-0000-4000-8000-000000000003",
    identifier: "e2e-unpublished-draft",
    name: "Entwurf (unveröffentlicht)",
    shortDescription: "Darf in keiner Antwort erscheinen.",
    aiDescription: "Draft skill that is not published.",
    instructions: "Draft.",
    skillCategoryId: categories[1].id,
    iconUrl: null,
    featured: false,
    published: false,
    preInstalled: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];

const integrations: IntegrationResponseDto[] = [
  {
    id: "b0000000-0000-4000-8000-000000000001",
    identifier: "e2e-council-data",
    name: "Ratsinformationssystem",
    shortDescription:
      "Zugriff auf Sitzungen, Vorlagen und Beschlüsse des Ratsinformationssystems.",
    description:
      "Bindet das Ratsinformationssystem der Kommune als MCP-Integration an. Ein Admin richtet die Verbindung ein.",
    iconName: null,
    logoUrl: null,
    serverUrl: "http://127.0.0.1:1/mcp",
    configSchema: { authType: "none", orgFields: [], userFields: [] },
    integrationCategoryId: null,
    featured: true,
    published: true,
    preInstalled: false,
    legalTextUrl: null,
    legalTextVersion: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];

let outage = false;

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const route = `${request.method} ${url.pathname}`;
  console.log(`${new Date().toISOString()} ${route}${url.search}`);

  if (route === "GET /health") {
    return sendJson(response, 200, { status: "ok" });
  }
  if (route === "POST /__e2e/outage") {
    const body = JSON.parse((await readBody(request)) || "{}") as {
      enabled?: unknown;
    };
    outage = body.enabled === true;
    return sendJson(response, 200, { outage });
  }
  if (outage) {
    return sendJson(response, 503, { message: "Marketplace unavailable" });
  }
  return handleApiRoute(route, url, response);
});

server.listen(port, "127.0.0.1");

function handleApiRoute(route: string, url: URL, response: ServerResponse) {
  if (route === "GET /api/skill-categories") {
    return sendJson(response, 200, categories);
  }
  if (route === "GET /api/skills") {
    const page: PaginatedSkillsResponseDto = paginate(
      filterSkills(url.searchParams).map(toSkillListDto),
      url,
    );
    return sendJson(response, 200, page);
  }
  if (route === "GET /api/skills/pre-installed") {
    return sendJson(response, 200, [] satisfies SkillListResponseDto[]);
  }
  if (route.startsWith("GET /api/skills/")) {
    return sendDetail(response, skills, url.pathname.split("/").at(-1));
  }
  if (route === "GET /api/integrations") {
    const page: PaginatedIntegrationsResponseDto = paginate(
      published(integrations).map(toIntegrationListDto),
      url,
    );
    return sendJson(response, 200, page);
  }
  if (route === "GET /api/integrations/pre-installed") {
    return sendJson(response, 200, [] satisfies IntegrationListResponseDto[]);
  }
  if (route.startsWith("GET /api/integrations/")) {
    return sendDetail(response, integrations, url.pathname.split("/").at(-1));
  }
  return sendJson(response, 404, { message: "Not found" });
}

function published<T extends { published: boolean }>(entries: T[]): T[] {
  return entries.filter((entry) => entry.published);
}

function filterSkills(searchParams: URLSearchParams): SkillResponseDto[] {
  const categoryId = searchParams.get("categoryId");
  const featured = searchParams.get("featured");
  return published(skills).filter(
    (skill) =>
      (categoryId === null || skill.skillCategoryId === categoryId) &&
      (featured === null || String(skill.featured) === featured),
  );
}

function paginate<T>(entries: T[], url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const requestedLimit = Number(url.searchParams.get("limit"));
  const limit = Math.min(
    MAX_PAGE_LIMIT,
    Math.max(1, requestedLimit || DEFAULT_PAGE_LIMIT),
  );
  const start = (page - 1) * limit;
  return {
    data: entries.slice(start, start + limit),
    total: entries.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(entries.length / limit)),
  };
}

function sendDetail<T extends { identifier: string; published: boolean }>(
  response: ServerResponse,
  entries: T[],
  identifier: string | undefined,
) {
  const entry = published(entries).find(
    (candidate) => candidate.identifier === identifier,
  );
  if (!entry) {
    return sendJson(response, 404, { message: `Not found: ${identifier}` });
  }
  return sendJson(response, 200, entry);
}

function toSkillListDto(skill: SkillResponseDto): SkillListResponseDto {
  return {
    id: skill.id,
    identifier: skill.identifier,
    name: skill.name,
    shortDescription: skill.shortDescription,
    aiDescription: skill.aiDescription,
    skillCategoryId: skill.skillCategoryId,
    iconUrl: skill.iconUrl,
    featured: skill.featured,
    published: skill.published,
    preInstalled: skill.preInstalled,
  };
}

function toIntegrationListDto(
  integration: IntegrationResponseDto,
): IntegrationListResponseDto {
  return {
    id: integration.id,
    identifier: integration.identifier,
    name: integration.name,
    shortDescription: integration.shortDescription,
    iconName: integration.iconName,
    logoUrl: integration.logoUrl,
    integrationCategoryId: integration.integrationCategoryId,
    featured: integration.featured,
    published: integration.published,
    preInstalled: integration.preInstalled,
  };
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}
