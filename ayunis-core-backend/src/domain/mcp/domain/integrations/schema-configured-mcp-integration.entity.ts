import type { UUID } from 'crypto';
import type { McpIntegrationAuth } from 'src/domain/mcp/domain/auth/mcp-integration-auth.entity';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import type {
  ConfigField,
  IntegrationConfigSchema,
} from 'src/domain/mcp/domain/value-objects/integration-config-schema';
import {
  fieldRequiresInput,
  isConfigValuePresent,
  normalizeIntegrationConfigSchema,
} from 'src/domain/mcp/domain/value-objects/integration-config-schema';

export abstract class SchemaConfiguredMcpIntegration extends McpIntegration {
  private _configSchema: IntegrationConfigSchema;
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
    this._configSchema = normalizeIntegrationConfigSchema(params.configSchema);
    this._orgConfigValues = { ...params.orgConfigValues };
  }

  get orgConfigValues(): Record<string, string> {
    return { ...this._orgConfigValues };
  }

  get configSchema(): IntegrationConfigSchema {
    return this._configSchema;
  }

  updateConfigSchema(schema: IntegrationConfigSchema): void {
    this._configSchema = normalizeIntegrationConfigSchema(schema);
    this.touch();
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
