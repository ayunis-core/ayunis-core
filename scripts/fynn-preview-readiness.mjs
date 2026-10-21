import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

function localApiUrl(value) {
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    !local ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Readiness probes require local URLs without credentials, query or fragment",
    );
  }
  return url.href.replace(/\/$/, "");
}

async function probe(name, url, options, expectedStatus) {
  try {
    const response = await fetch(url, {
      ...options,
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
    await response.body?.cancel();
    return {
      name,
      ok: response.status === expectedStatus,
      status: response.status,
      expectedStatus,
    };
  } catch {
    return {
      name,
      ok: false,
      reason: "Local endpoint unavailable or redirected",
    };
  }
}

export async function checkReadiness({
  coreApiUrl,
  connectUrl,
  env = process.env,
}) {
  const core = localApiUrl(coreApiUrl);
  const connect = localApiUrl(connectUrl);
  const checks = [
    { name: "Fynn API key present", ok: Boolean(env.FYNN_API_KEY?.trim()) },
    {
      name: "Connect service token present",
      ok: Boolean(env.CORE_CONNECT_SERVICE_TOKEN?.trim()),
    },
    {
      name: "Fynn source is Preview",
      ok:
        env.FYNN_API_BASE_URL?.replace(/\/$/, "") ===
        "https://preview.coreapi.io",
    },
  ];
  checks.push(await probe("Core health", `${core}/health`, {}, 200));
  if (env.CORE_CONNECT_SERVICE_TOKEN?.trim()) {
    checks.push(
      await probe(
        "Core Fynn route authenticates before rejecting an invalid UUID",
        `${core}/internal/core-connect/fynn/subscriptions/readiness-invalid-uuid/sync`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.CORE_CONNECT_SERVICE_TOKEN}`,
          },
        },
        400,
      ),
    );
  }
  checks.push(await probe("Connect health", `${connect}/health`, {}, 200));
  checks.push(
    await probe(
      "Connect rejects an invalid Fynn signature",
      `${connect}/webhooks/fynn`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": "0".repeat(64),
        },
        body: "{}",
      },
      401,
    ),
  );
  return {
    ok: checks.every((check) => check.ok),
    liveFynnDelivery: "pending",
    checks,
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      "core-api-url": { type: "string" },
      "connect-url": { type: "string" },
    },
  });
  if (!values["core-api-url"] || !values["connect-url"]) {
    throw new Error(
      "Usage: node scripts/fynn-preview-readiness.mjs --core-api-url http://localhost:PORT/api --connect-url http://localhost:PORT",
    );
  }
  const result = await checkReadiness({
    coreApiUrl: values["core-api-url"],
    connectUrl: values["connect-url"],
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(() => {
    process.stderr.write(
      "Readiness check failed. Use local URLs and verify the development configuration. Secrets are never printed.\n",
    );
    process.exitCode = 1;
  });
}
