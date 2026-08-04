import type { IntegrationConfigSchema } from 'src/domain/mcp/domain/value-objects/integration-config-schema';

export class CreateCustomMcpIntegrationCommand {
  constructor(
    public readonly name: string,
    public readonly serverUrl: string,
    public readonly configSchema: IntegrationConfigSchema,
    public readonly orgConfigValues: Record<string, string>,
    public readonly returnsPii?: boolean,
    public readonly oauthClient?: {
      clientId: string;
      clientSecret?: string;
    },
  ) {}
}
