import type { IntegrationConfigSchema } from '../../../domain/value-objects/integration-config-schema';

export class CreateSelfDefinedMcpIntegrationCommand {
  constructor(
    public readonly name: string,
    public readonly serverUrl: string,
    public readonly configSchema: IntegrationConfigSchema,
    public readonly orgConfigValues: Record<string, string>,
    public readonly description?: string,
    public readonly oauthClientId?: string,
    public readonly oauthClientSecret?: string,
    public readonly returnsPii?: boolean,
  ) {}
}
