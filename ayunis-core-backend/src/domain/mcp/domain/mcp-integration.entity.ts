import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { McpIntegrationAuth } from './auth/mcp-integration-auth.entity';
import type { McpAuthMethod } from './value-objects/mcp-auth-method.enum';
import { McpIntegrationKind } from './value-objects/mcp-integration-kind.enum';

/**
 * Base domain model for MCP integrations. Holds shared metadata while delegating
 * integration-specific fields (e.g. slug, serverUrl) to concrete subclasses and
 * authentication concerns to the composed `McpIntegrationAuth` hierarchy.
 */
export abstract class McpIntegration {
  public readonly id: UUID;
  public readonly orgId: UUID;
  public name: string;
  public enabled: boolean;
  public readonly createdAt: Date;
  public updatedAt: Date;
  public connectionStatus: string;
  public lastConnectionError?: string;
  public lastConnectionCheck?: Date;
  public returnsPii: boolean;

  private _auth: McpIntegrationAuth;

  protected constructor(params: {
    id?: UUID;
    orgId: UUID;
    name: string;
    enabled?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    connectionStatus?: string;
    lastConnectionError?: string;
    lastConnectionCheck?: Date;
    returnsPii?: boolean;
    auth: McpIntegrationAuth;
  }) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.name = params.name;
    this.enabled = params.enabled ?? true;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
    this.connectionStatus = params.connectionStatus ?? 'pending';
    this.lastConnectionError = params.lastConnectionError;
    this.lastConnectionCheck = params.lastConnectionCheck;
    this.returnsPii = params.returnsPii ?? true; // Default to true for safety
    this._auth = params.auth;
  }

  /**
   * Returns discriminator describing whether integration is predefined or custom.
   */
  abstract get kind(): McpIntegrationKind;

  /**
   * All integrations expose their MCP server URL via this accessor.
   */
  abstract get serverUrl(): string;

  /**
   * Returns authentication object currently linked to this integration.
   */
  get auth(): McpIntegrationAuth {
    return this._auth;
  }

  /**
   * Replaces authentication method and refreshes update timestamp.
   */
  setAuth(auth: McpIntegrationAuth): void {
    this._auth = auth;
    this.touch();
  }

  getAuthType(): McpAuthMethod {
    return this._auth.getMethod();
  }

  updateConnectionStatus(status: string, error?: string): void {
    this.connectionStatus = status;
    this.lastConnectionError = error;
    this.lastConnectionCheck = new Date();
    this.touch();
  }

  disable(): void {
    this.enabled = false;
    this.touch();
  }

  enable(): void {
    this.enabled = true;
    this.touch();
  }

  updateName(newName: string): void {
    this.name = newName;
    this.touch();
  }

  isPredefined(): boolean {
    return this.kind === McpIntegrationKind.PREDEFINED;
  }

  isCustom(): boolean {
    return this.kind === McpIntegrationKind.CUSTOM;
  }

  updateReturnsPii(value: boolean): void {
    this.returnsPii = value;
    this.touch();
  }

  protected touch(): void {
    this.updatedAt = new Date();
  }
}

export { CustomMcpIntegration } from './integrations/custom-mcp-integration.entity';
export { PredefinedMcpIntegration } from './integrations/predefined-mcp-integration.entity';
