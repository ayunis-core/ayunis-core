import { randomUUID, UUID } from 'crypto';

/**
 * Per-user configuration for a marketplace MCP integration.
 * Stores user-level config values (e.g. personal access tokens)
 * that override org-level values for matching header names at runtime.
 *
 * Unique constraint: one config per (integrationId, userId) pair.
 */
export class McpIntegrationUserConfig {
  public readonly id: UUID;
  public readonly integrationId: UUID;
  public readonly userId: UUID;
  private _configValues: Record<string, string>;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(params: {
    id?: UUID;
    integrationId: UUID;
    userId: UUID;
    configValues: Record<string, string>;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.integrationId = params.integrationId;
    this.userId = params.userId;
    this._configValues = { ...params.configValues };
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  get configValues(): Record<string, string> {
    return { ...this._configValues };
  }

  updateConfigValues(values: Record<string, string>): void {
    this._configValues = { ...values };
    this.updatedAt = new Date();
  }

  getConfigValue(key: string): string | undefined {
    return this._configValues[key];
  }
}
