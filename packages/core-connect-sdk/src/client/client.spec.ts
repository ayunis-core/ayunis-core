import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCoreClient } from "./index.js";

const id = "00000000-0000-4000-8000-000000000004";

describe("generated Core client and Fetch transport", () => {
  let server: Server;
  let baseUrl: string;
  let status: number;
  let requests: Array<{
    url?: string;
    authorization?: string;
    delivery?: string | string[];
    method?: string;
    body: string;
  }>;
  const api = () =>
    createCoreClient({ baseUrl, token: "local-contract-token" });
  const options = () => ({
    signal: new AbortController().signal,
    deliveryId: "contract-delivery",
  });

  beforeEach(async () => {
    status = 200;
    requests = [];
    server = createServer((request, response) => {
      let body = "";
      request.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      request.on("end", () => {
        requests.push({
          url: request.url,
          method: request.method,
          authorization: request.headers.authorization,
          delivery: request.headers["x-webhook-id"],
          body,
        });
        response.writeHead(status, { Location: "/redirected" });
        response.end(JSON.stringify({ revision: id, ownerId: null }));
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it("posts the generated preparation with its JSON body and delivery metadata", async () => {
    const result = await api().prepareExternalSubscription(
      id,
      { mode: "sync" },
      options(),
    );
    expect(result).toEqual({
      ok: true,
      status: 200,
      data: { revision: id, ownerId: null },
    });
    expect(requests).toEqual([
      {
        url: `/api/internal/core-connect/subscription-sync/organizations/${id}/preparations`,
        method: "POST",
        authorization: "Bearer local-contract-token",
        delivery: "contract-delivery",
        body: JSON.stringify({ mode: "sync" }),
      },
    ]);
  });

  it("posts normalized state with authenticated transport and delivery metadata", async () => {
    const body = {
      revision: id,
      ownerId: "billing/customer",
      subscription: null,
      academyActive: false,
      revoke: false,
    };
    await api().applyExternalSubscription(id, body, options());
    expect(requests[0]).toMatchObject({
      url: `/api/internal/core-connect/subscription-sync/organizations/${id}/state`,
      authorization: "Bearer local-contract-token",
      delivery: "contract-delivery",
      body: JSON.stringify(body),
    });
  });

  it("encodes ownership filters without losing authenticated transport options", async () => {
    await api().listExternalSubscriptionLinks(
      "billing/customer?other=value",
      options(),
    );
    expect(requests[0]?.url).toBe(
      "/api/internal/core-connect/subscription-sync/links?ownerId=billing%2Fcustomer%3Fother%3Dvalue",
    );
    expect(requests[0]?.authorization).toBe("Bearer local-contract-token");
  });

  it("encodes IDs exactly once", async () => {
    await api().prepareExternalSubscription(
      "customer/id?extra=1",
      { mode: "sync" },
      options(),
    );
    expect(requests[0]?.url).toBe(
      "/api/internal/core-connect/subscription-sync/organizations/customer%2Fid%3Fextra%3D1/preparations",
    );
  });

  it("refuses redirects without forwarding the token to another URL", async () => {
    status = 302;
    await expect(
      api().prepareExternalSubscription(id, { mode: "sync" }, options()),
    ).rejects.toThrow();
    expect(requests).toHaveLength(1);
  });

  it.each([401, 404, 503])(
    "preserves HTTP status %i for the caller",
    async (code) => {
      status = code;
      const response = await api().prepareExternalSubscription(
        id,
        { mode: "sync" },
        options(),
      );
      expect(response.status).toBe(code);
    },
  );

  it.each([
    "https://user:password@core.example/api",
    "http://core.example/api",
    "https://core.example/api?token=secret",
    "https://core.example/api#token",
  ])("rejects unsafe base URL %s", (url) => {
    expect(() =>
      createCoreClient({ baseUrl: url, token: "local-contract-token" }),
    ).toThrow();
  });

  it.each(["", "   ", "token\r\ninjected: true"])(
    "rejects an empty or multiline token",
    (token) => {
      expect(() => createCoreClient({ baseUrl, token })).toThrow();
    },
  );

  it("supports calls without delivery metadata", async () => {
    expect(
      (await api().prepareExternalSubscription(id, { mode: "sync" })).status,
    ).toBe(200);
    expect(requests[0]?.authorization).toBe("Bearer local-contract-token");
    expect(requests[0]?.delivery).toBeUndefined();
  });

  it("honors the caller cancellation signal", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      api().prepareExternalSubscription(
        id,
        { mode: "sync" },
        {
          ...options(),
          signal: controller.signal,
        },
      ),
    ).rejects.toThrow();
    expect(requests).toHaveLength(0);
  });
  it("returns typed synchronization data without exposing the response body stream", async () => {
    const result = await api().prepareExternalSubscription(
      id,
      { mode: "sync" },
      options(),
    );
    expect(result).toEqual({
      ok: true,
      status: 200,
      data: { revision: id, ownerId: null },
    });
    expect(result).not.toHaveProperty("json");
  });
});
