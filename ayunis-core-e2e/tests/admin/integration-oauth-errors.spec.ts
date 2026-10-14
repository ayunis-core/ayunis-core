import {
  createServer,
  type Server,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import {
  authorizeIntegration,
  completeIntegration,
  createCustomIntegration,
} from "../../src/clients/api/integrations.client";
import { test, expect } from "../../src/fixtures/test";

let server: Server;
let baseUrl: string;
let failingPath: string;
let failingStatus: number;
const privateBody = "<!DOCTYPE html>upstream-body-must-not-leak";

test.beforeEach(async () => {
  failingPath = "";
  failingStatus = 500;
  server = createServer((request, response) => respond(request, response));
  baseUrl = await new Promise<string>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("OAuth fixture did not expose a TCP port"));
        return;
      }
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
});

test.afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

for (const [stage, path, status] of [
  ["resource discovery", "/.well-known/oauth-protected-resource/mcp", 500],
  ["client registration", "/register", 401],
  ["token exchange", "/token", 502],
] as const) {
  test(`returns a safe 502 for HTML during OAuth ${stage}`, async ({ api }) => {
    failingPath = path;
    failingStatus = status;
    const integration = await createCustomIntegration(api, {
      name: `OAuth error ${stage} ${Date.now()}`,
      serverUrl: `${baseUrl}/mcp`,
      configSchema: {
        authType: "OAUTH",
        orgFields: [],
        userFields: [],
        oauth: { clientRegistration: "automatic" },
      },
      orgConfigValues: {},
    });
    const operation = async () => {
      const { authorizationUrl } = await authorizeIntegration(
        api,
        integration.id,
      );
      const state = new URL(authorizationUrl).searchParams.get("state");
      expect(state).toBeTruthy();
      await completeIntegration(api, state!, baseUrl);
    };
    const error: unknown = await operation().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toContain("HTTP 502");
    expect(message).toContain("MCP_OAUTH_INVALID_RESPONSE");
    expect(message).not.toContain("upstream-body-must-not-leak");
    expect(message).not.toContain("e2e-authorization-code");
  });
}

function respond(request: IncomingMessage, response: ServerResponse): void {
  if (request.url === failingPath) {
    response.writeHead(failingStatus, { "content-type": "text/html" });
    response.end(privateBody);
    return;
  }
  if (request.url?.startsWith("/.well-known/oauth-protected-resource")) {
    json(response, {
      resource: `${baseUrl}/mcp`,
      authorization_servers: [baseUrl],
    });
    return;
  }
  if (request.url === "/.well-known/oauth-authorization-server") {
    json(response, {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/authorize`,
      token_endpoint: `${baseUrl}/token`,
      registration_endpoint: `${baseUrl}/register`,
      response_types_supported: ["code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
    });
    return;
  }
  if (request.url === "/register") {
    registration(request, response);
    return;
  }
  response.writeHead(404);
  response.end();
}

function registration(
  request: IncomingMessage,
  response: ServerResponse,
): void {
  let body = "";
  request.setEncoding("utf8");
  request.on("data", (chunk: string) => {
    body += chunk;
  });
  request.on("end", () => {
    const metadata = JSON.parse(body) as { redirect_uris: string[] };
    json(response, {
      client_id: "e2e-oauth-client",
      redirect_uris: metadata.redirect_uris,
    });
  });
}

function json(response: ServerResponse, body: object): void {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}
