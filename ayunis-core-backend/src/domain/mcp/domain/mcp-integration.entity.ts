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
  public description?: string;
  /**
   * Base-class OAuth client credentials shared by `MARKETPLACE` and
   * `SELF_DEFINED` integrations. The Step 3 migration adds the backing
   * columns (`oauth_client_id`, `oauth_client_secret_encrypted`) directly to
   * the base `mcp_integrations` table so both kinds can persist them
   * without duplicating schema. `CUSTOM` and `PREDEFINED` integrations never
   * populate these — the mutators below enforce that at runtime.
   *
   * Transitional state: a parallel legacy `OAuthMcpIntegrationAuth` entity
   * under `domain/mcp/domain/auth/` is still used by the legacy
   * `CreateMcpIntegrationUseCase` OAuth branch (which currently throws
   * `McpAuthNotImplementedError`). New OAuth flows use these fields plus
   * `McpIntegrationOAuthToken`; the legacy entity is untouched by this task
   * (scheduled for removal in Step 7, which also deletes
   * `McpOAuthNotSupportedError` and unblocks marketplace OAuth).
   */
  public oauthClientId?: string;
  public oauthClientSecretEncrypted?: string;

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
    description?: string;
    auth: McpIntegrationAuth;
    oauthClientId?: string;
    oauthClientSecretEncrypted?: string;
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
    this.description = params.description;
    this._auth = params.auth;

    // Enforce both-or-neither on OAuth client credentials so a buggy
    // rehydration path cannot construct a half-configured entity.
    const hasId = params.oauthClientId !== undefined;
    const hasSecret = params.oauthClientSecretEncrypted !== undefined;
    if (hasId !== hasSecret) {
      throw new Error(
        'oauthClientId and oauthClientSecretEncrypted must be set together',
      );
    }
    if (hasId && hasSecret) {
      // Also enforce the kind guard at construction time so a mis-wired
      // mapper or future subclass cannot rehydrate OAuth credentials onto a
      // kind that does not support them. Safe to call here because `kind`
      // is a constant getter implemented by each subclass.
      this.assertSupportsOAuthClientCredentials();
    }
    this.oauthClientId = params.oauthClientId;
    this.oauthClientSecretEncrypted = params.oauthClientSecretEncrypted;
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

  isMarketplace(): boolean {
    return this.kind === McpIntegrationKind.MARKETPLACE;
  }

  isSelfDefined(): boolean {
    return this.kind === McpIntegrationKind.SELF_DEFINED;
  }

  updateReturnsPii(value: boolean): void {
    this.returnsPii = value;
    this.touch();
  }

  /**
   * Sets the OAuth client credentials for this integration. The secret must
   * already be encrypted by the caller via `McpCredentialEncryptionPort`.
   *
   * Only `MARKETPLACE` and `SELF_DEFINED` integrations support OAuth client
   * credentials; calling this on any other kind throws so that
   * silently-dropped-by-the-mapper bugs are caught at the call site.
   */
  setOAuthClientCredentials(clientId: string, encryptedSecret: string): void {
    this.assertSupportsOAuthClientCredentials();
    this.oauthClientId = clientId;
    this.oauthClientSecretEncrypted = encryptedSecret;
    this.touch();
  }

  /**
   * Clears any OAuth client credentials previously set on this integration.
   * Restricted to kinds that support OAuth client credentials (see
   * {@link setOAuthClientCredentials}).
   */
  clearOAuthClientCredentials(): void {
    this.assertSupportsOAuthClientCredentials();
    this.oauthClientId = undefined;
    this.oauthClientSecretEncrypted = undefined;
    this.touch();
  }

  private assertSupportsOAuthClientCredentials(): void {
    if (
      this.kind !== McpIntegrationKind.MARKETPLACE &&
      this.kind !== McpIntegrationKind.SELF_DEFINED
    ) {
      throw new Error(
        `OAuth client credentials are only supported for MARKETPLACE and SELF_DEFINED integrations, got ${this.kind}`,
      );
    }
  }

  protected touch(): void {
    this.updatedAt = new Date();
  }
}

export { CustomMcpIntegration } from './integrations/custom-mcp-integration.entity';
export { PredefinedMcpIntegration } from './integrations/predefined-mcp-integration.entity';
