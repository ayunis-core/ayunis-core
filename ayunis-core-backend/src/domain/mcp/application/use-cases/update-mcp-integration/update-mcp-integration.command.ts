import type { IntegrationConfigSchema } from 'src/domain/mcp/domain/value-objects/integration-config-schema';

type UpdateIntegrationConfigSchema = Omit<
  IntegrationConfigSchema,
  'authType'
> & {
  authType?: IntegrationConfigSchema['authType'];
};

interface UpdateMcpIntegrationParams {
  integrationId: string;
  name?: string;
  serverUrl?: string;
  configSchema?: UpdateIntegrationConfigSchema;
  credentials?: string;
  authHeaderName?: string;
  returnsPii?: boolean;
  orgConfigValues?: Record<string, string>;
  oauthClient?: { clientId: string; clientSecret?: string };
}

export class UpdateMcpIntegrationCommand {
  public readonly integrationId: string;
  public readonly name?: string;
  public readonly serverUrl?: string;
  public readonly configSchema?: UpdateIntegrationConfigSchema;
  public readonly credentials?: string;
  public readonly authHeaderName?: string;
  public readonly returnsPii?: boolean;
  public readonly orgConfigValues?: Record<string, string>;
  public readonly oauthClient?: { clientId: string; clientSecret?: string };

  constructor(params: UpdateMcpIntegrationParams) {
    this.integrationId = params.integrationId;
    this.name = params.name;
    this.serverUrl = params.serverUrl;
    this.configSchema = params.configSchema;
    this.credentials = params.credentials;
    this.authHeaderName = params.authHeaderName;
    this.returnsPii = params.returnsPii;
    this.orgConfigValues = params.orgConfigValues;
    this.oauthClient = params.oauthClient;
  }
}
