import type { APIRequestContext } from '@playwright/test';
import { createCustomIntegration } from '../clients/api/integrations.client';
import { getEffectiveDefaultModel } from '../clients/api/models.client';
import {
  attachMcpIntegration,
  createEmptyThread,
} from '../clients/api/threads.client';
import type { McpIntegrationResponseDto } from '../clients/generated/ayunisCoreAPI.schemas';
import type { EchoMcpServer } from '../servers/echo-mcp.server';

export function createEchoMcpIntegration(
  api: APIRequestContext,
  server: EchoMcpServer,
): Promise<McpIntegrationResponseDto> {
  return createCustomIntegration(api, {
    name: `E2E echo ${Date.now()}`,
    serverUrl: server.url,
    configSchema: { authType: 'CUSTOM', orgFields: [], userFields: [] },
    orgConfigValues: {},
  });
}

// Returns the ID of a new chat on the org's default model that offers the
// integration's tools.
export async function createThreadWithMcpIntegration(
  api: APIRequestContext,
  integrationId: string,
): Promise<string> {
  const defaultModel = await getEffectiveDefaultModel(api);
  if (!defaultModel) throw new Error('The org has no default model');
  const thread = await createEmptyThread(api, defaultModel.id);
  await attachMcpIntegration(api, thread.id, integrationId);
  return thread.id;
}
