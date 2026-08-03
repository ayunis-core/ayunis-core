import type { UUID } from 'crypto';
import type { McpIntegrationAuth } from '../auth/mcp-integration-auth.entity';
import { McpIntegration } from '../mcp-integration.entity';
import type {
  ConfigField,
  IntegrationConfigSchema,
} from '../value-objects/integration-config-schema';
import {
  fieldRequiresInput,
  isConfigValuePresent,
  normalizeIntegrationConfigSchema,
} from '../value-objects/integration-config-schema';

export abstract class SchemaConfiguredMcpIntegration extends McpIntegration {
  public readonly configSchema: IntegrationConfigSchema;
  private _orgConfigValues: Record<string, string>;

  protected constructor(params: {
    id?: UUID;
    orgId: UUID;
    name: string;
    configSchema: IntegrationConfigSchema;
    orgConfigValues: Record<string, string>;
    auth: McpIntegrationAuth;
    enabled?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    connectionStatus?: string;
    lastConnectionError?: string;
    lastConnectionCheck?: Date;
    returnsPii?: boolean;
    description?: string;
  }) {
    super(params);
    this.configSchema = normalizeIntegrationConfigSchema(params.configSchema);
    this._orgConfigValues = { ...params.orgConfigValues };
  }

  get orgConfigValues(): Record<string, string> {
    return { ...this._orgConfigValues };
  }

  updateOrgConfigValues(values: Record<string, string>): void {
    this._orgConfigValues = { ...values };
    this.touch();
  }

  get requiresUserAuthorization(): boolean {
    return (
      Boolean(this.configSchema.oauth) ||
      this.userFieldsRequiringInput.length > 0
    );
  }

  isUserAuthorized(userConfigValues: Record<string, string> | null): boolean {
    return this.userFieldsRequiringInput.every((field) =>
      isConfigValuePresent(userConfigValues?.[field.key]),
    );
  }

  private get userFieldsRequiringInput(): ConfigField[] {
    return this.configSchema.userFields.filter(fieldRequiresInput);
  }
}
