import type { APIRequestContext } from '@playwright/test';
import { saveMicrosoft365Connector } from '../clients/api/connectors.client';

// Keep in sync with CONNECTED_TENANT_ID in src/servers/entra-mock.mjs: the
// Entra stand-in issues this tenant's app a token for the Graph stand-in.
const CONNECTED_TENANT_ID = 'e2e0c0de-1a2b-4c3d-8e4f-5a6b7c8d9e0f';
const CLIENT_ID = '0b8a7d11-2f1f-4f4e-9a59-6f1c2c4e3c1a';

/** Sets up the organization's Microsoft 365 connection with the stand-ins. */
export async function connectMicrosoft365(api: APIRequestContext): Promise<void> {
  await saveMicrosoft365Connector(api, {
    tenantId: CONNECTED_TENANT_ID,
    clientId: CLIENT_ID,
    clientSecret: `e2e-secret-${Date.now()}`,
  });
}
