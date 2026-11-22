import { Buffer } from "node:buffer";
import { createServer } from "node:http";
import process from "node:process";
import { URL, URLSearchParams } from "node:url";

// Stands in for https://login.microsoftonline.com (MICROSOFT_LOGIN_URL), so
// testing a Microsoft 365 connection in e2e never reaches Microsoft Entra.
const port = Number(process.env.E2E_ENTRA_PORT ?? 3196);

// Keep in sync with CONNECTED_TENANT_ID in tests/connectors/microsoft-365-connection-test.spec.ts
// and src/factories/microsoft-365.factory.ts.
// Entra issues this tenant's app a Graph token; every other tenant is unknown.
const CONNECTED_TENANT_ID = "e2e0c0de-1a2b-4c3d-8e4f-5a6b7c8d9e0f";
const GRANTED_ROLES = ["Sites.Selected", "Files.SelectedOperations.Selected"];
const GRAPH_SCOPE = "https://graph.microsoft.com/.default";

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  if (request.method === "GET" && url.pathname === "/health") {
    return sendJson(response, 200, { status: "ok" });
  }
  const tenant = url.pathname.match(/^\/([^/]+)\/oauth2\/v2\.0\/token$/)?.[1];
  if (request.method !== "POST" || !tenant) {
    return sendJson(response, 404, { message: "Not found" });
  }
  let body = "";
  request.on("data", (chunk) => (body += chunk));
  request.on("end", () => {
    const scope = new URLSearchParams(body).get("scope");
    if (tenant !== CONNECTED_TENANT_ID) {
      return sendJson(response, 400, {
        error: "invalid_request",
        error_description: `AADSTS90002: Tenant '${tenant}' not found.`,
        error_codes: [90002],
      });
    }
    const roles = scope === GRAPH_SCOPE ? GRANTED_ROLES : undefined;
    return sendJson(response, 200, {
      token_type: "Bearer",
      expires_in: 3599,
      access_token: unsignedJwt({ aud: scope, roles }),
    });
  });
});

server.listen(port, "127.0.0.1");

function unsignedJwt(payload) {
  const part = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "none", typ: "JWT" })}.${part(payload)}.e2e`;
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}
