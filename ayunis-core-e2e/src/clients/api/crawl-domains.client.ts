import { request, type APIRequestContext } from "@playwright/test";
import { config } from "../../config";
import { login } from "./auth.client";
import { generatedApi } from "./generated-api";

async function asSuperAdmin<T>(
  operation: (api: APIRequestContext) => Promise<T>,
): Promise<T> {
  const api = await request.newContext({ baseURL: config.apiURL });
  try {
    await login(api, "admin@demo.local", "admin");
    return await operation(api);
  } finally {
    await api.dispose();
  }
}

export function grantCrawlDomain(orgId: string, domain: string) {
  return asSuperAdmin((api) =>
    generatedApi.superAdminCrawlDomainsControllerGrant(
      orgId,
      { domain },
      { api },
    ),
  );
}

export function revokeCrawlDomain(
  orgId: string,
  grantId: string,
): Promise<void> {
  return asSuperAdmin((api) =>
    generatedApi.superAdminCrawlDomainsControllerRevoke(orgId, grantId, {
      api,
    }),
  );
}
