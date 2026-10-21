import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { checkReadiness } from "./fynn-preview-readiness.mjs";

const env = {
  FYNN_API_KEY: "local-test-api-key",
  CORE_CONNECT_SERVICE_TOKEN: "local-test-service-token",
  FYNN_API_BASE_URL: "https://preview.coreapi.io",
};

test("rejects remote URLs before sending any service credential", async () => {
  await assert.rejects(
    checkReadiness({
      coreApiUrl: "https://core.ayunis.com/api",
      connectUrl: "http://localhost:1",
      env,
    }),
  );
  await assert.rejects(
    checkReadiness({
      coreApiUrl: "http://localhost:1/api",
      connectUrl: "https://example.com",
      env,
    }),
  );
});

test("checks local routing and signature rejection without using the Fynn API or exposing secrets", async () => {
  const paths = [];
  const server = createServer((request, response) => {
    paths.push(request.url);
    if (request.url.includes("readiness-invalid-uuid")) {
      assert.equal(
        request.headers.authorization,
        `Bearer ${env.CORE_CONNECT_SERVICE_TOKEN}`,
      );
      response.writeHead(400);
    } else response.writeHead(request.url === "/webhooks/fynn" ? 401 : 200);
    response.end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const result = await checkReadiness({
      coreApiUrl: `${base}/api`,
      connectUrl: base,
      env,
    });
    assert.equal(result.ok, true);
    assert.equal(result.liveFynnDelivery, "pending");
    assert.equal(paths.length, 4);
    assert.ok(!JSON.stringify(result).includes(env.CORE_CONNECT_SERVICE_TOKEN));
    assert.ok(!JSON.stringify(result).includes(env.FYNN_API_KEY));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
