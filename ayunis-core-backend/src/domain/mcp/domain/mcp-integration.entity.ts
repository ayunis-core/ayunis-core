import { randomUUID } from 'crypto';
import { McpAuthMethod } from './mcp-auth-method.enum';
import { PredefinedMcpIntegrationSlug } from './predefined-mcp-integration-slug.enum';

/**
 * Abstract base class for all MCP integrations.
 * Defines common fields and business logic shared by all integration types.
 */
export abstract class McpIntegration {
  public readonly id: string;
  public readonly name: string;
  public abstract readonly type: 'predefined' | 'custom';
  public readonly authMethod?: McpAuthMethod;
  public readonly authHeaderName?: string;
  public encryptedCredentials?: string;
  public enabled: boolean;
  public readonly organizationId: string;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(
    id: string | null,
    name: string,
    organizationId: string,
    enabled: boolean = true,
    authMethod?: McpAuthMethod,
    authHeaderName?: string,
    encryptedCredentials?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.id = id ?? randomUUID();
    this.name = name;
    this.organizationId = organizationId;
    this.enabled = enabled;
    this.authMethod = authMethod;
    this.authHeaderName = authHeaderName;
    this.encryptedCredentials = encryptedCredentials;
    this.createdAt = createdAt ?? new Date();
    this.updatedAt = updatedAt ?? new Date();
  }

  /**
   * Disables the integration and updates the timestamp.
   */
  disable(): void {
    this.enabled = false;
    this.updatedAt = new Date();
  }

  /**
   * Enables the integration and updates the timestamp.
   */
  enable(): void {
    this.enabled = true;
    this.updatedAt = new Date();
  }

  /**
   * Updates the encrypted credentials and updates the timestamp.
   * @param newEncryptedCredentials The new encrypted credentials
   */
  updateCredentials(newEncryptedCredentials: string): void {
    this.encryptedCredentials = newEncryptedCredentials;
    this.updatedAt = new Date();
  }

  /**
   * Updates the name of the integration.
   * @param newName The new name for the integration
   */
  updateName(newName: string): void {
    (this as any).name = newName;
    this.updatedAt = new Date();
  }

  /**
   * Updates the authentication configuration.
   * @param authMethod The authentication method (optional)
   * @param authHeaderName The authentication header name (optional)
   * @param encryptedCredentials The encrypted credentials (optional)
   */
  updateAuth(
    authMethod?: McpAuthMethod,
    authHeaderName?: string,
    encryptedCredentials?: string,
  ): void {
    (this as any).authMethod = authMethod;
    (this as any).authHeaderName = authHeaderName;
    this.encryptedCredentials = encryptedCredentials;
    this.updatedAt = new Date();
  }

  /**
   * Checks if the integration has authentication configured.
   * @returns true if authMethod is set, false otherwise
   */
  hasAuthentication(): boolean {
    return this.authMethod !== undefined;
  }
}

/**
 * Predefined MCP integration with a known slug.
 * Used for integrations that are pre-configured in the system.
 */
export class PredefinedMcpIntegration extends McpIntegration {
  readonly type = 'predefined';
  public readonly slug: PredefinedMcpIntegrationSlug;

  constructor(
    id: string | null,
    name: string,
    organizationId: string,
    slug: PredefinedMcpIntegrationSlug,
    enabled: boolean = true,
    authMethod?: McpAuthMethod,
    authHeaderName?: string,
    encryptedCredentials?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(
      id,
      name,
      organizationId,
      enabled,
      authMethod,
      authHeaderName,
      encryptedCredentials,
      createdAt,
      updatedAt,
    );
    this.slug = slug;
  }
}

/**
 * Custom MCP integration with a user-provided server URL.
 * Used for integrations that connect to custom MCP servers.
 */
export class CustomMcpIntegration extends McpIntegration {
  readonly type = 'custom';
  public readonly serverUrl: string;

  constructor(
    id: string | null,
    name: string,
    organizationId: string,
    serverUrl: string,
    enabled: boolean = true,
    authMethod?: McpAuthMethod,
    authHeaderName?: string,
    encryptedCredentials?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(
      id,
      name,
      organizationId,
      enabled,
      authMethod,
      authHeaderName,
      encryptedCredentials,
      createdAt,
      updatedAt,
    );
    this.serverUrl = serverUrl;
  }
}
