import type { IntegrationConfigSchema } from '../../../domain/value-objects/integration-config-schema';

interface UpdateMcpIntegrationParams {
  integrationId: string;
  name?: string;
  credentials?: string;
  authHeaderName?: string;
  returnsPii?: boolean;
  orgConfigValues?: Record<string, string>;
  oauthClientId?: string;
  oauthClientSecret?: string;
  configSchema?: IntegrationConfigSchema;
}

export class UpdateMcpIntegrationCommand {
  public readonly integrationId: string;
  public readonly name?: string;
  public readonly credentials?: string;
  public readonly authHeaderName?: string;
  public readonly returnsPii?: boolean;
  public readonly orgConfigValues?: Record<string, string>;
  public readonly oauthClientId?: string;
  public readonly oauthClientSecret?: string;
  public readonly configSchema?: IntegrationConfigSchema;

  constructor(params: UpdateMcpIntegrationParams) {
    this.integrationId = params.integrationId;
    this.name = params.name;
    this.credentials = params.credentials;
    this.authHeaderName = params.authHeaderName;
    this.returnsPii = params.returnsPii;
    this.orgConfigValues = params.orgConfigValues;
    this.oauthClientId = params.oauthClientId;
    this.oauthClientSecret = params.oauthClientSecret;
    this.configSchema = params.configSchema;
  }
}
