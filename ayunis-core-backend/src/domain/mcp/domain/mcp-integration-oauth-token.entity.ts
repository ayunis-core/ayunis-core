import { randomUUID, type UUID } from 'crypto';

/**
 * Stored OAuth token (access + optional refresh) for an MCP integration.
 *
 * The `userId` field encodes the authorization level:
 *   - `null`        → org-level token (admin authorized once for the whole org)
 *   - non-null UUID → per-user token (each user authorizes individually)
 *
 * The exact level for any given integration is declared by the integration's
 * `IntegrationConfigSchema.oauth.level`. This entity itself does not enforce
 * level — it is simply a storage record keyed by `(integrationId, userId|NULL)`.
 *
 * Token values are always encrypted at rest using the same
 * `McpCredentialEncryptionPort` used for other MCP secrets.
 */
export class McpIntegrationOAuthToken {
  public readonly id: UUID;
  public readonly integrationId: UUID;
  public readonly userId: UUID | null;
  public accessTokenEncrypted: string;
  public refreshTokenEncrypted?: string;
  public tokenExpiresAt?: Date;
  public scope?: string;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(params: {
    id?: UUID;
    integrationId: UUID;
    userId: UUID | null;
    accessTokenEncrypted: string;
    refreshTokenEncrypted?: string;
    tokenExpiresAt?: Date;
    scope?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.integrationId = params.integrationId;
    this.userId = params.userId;
    this.accessTokenEncrypted = params.accessTokenEncrypted;
    this.refreshTokenEncrypted = params.refreshTokenEncrypted;
    this.tokenExpiresAt = params.tokenExpiresAt;
    this.scope = params.scope;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  /**
   * Returns true when the access token has a known expiry that is at or
   * before `now`. Tokens without an expiry are treated as non-expiring
   * (matches OAuth providers that issue long-lived tokens with no `expires_in`).
   */
  isExpired(now: Date = new Date()): boolean {
    if (!this.tokenExpiresAt) {
      return false;
    }
    return this.tokenExpiresAt.getTime() <= now.getTime();
  }

  /**
   * Replaces the encrypted access token and optional related fields. Only
   * fields explicitly passed are updated; omitted fields are left untouched
   * (this matches the OAuth refresh contract where the server may return a
   * new access token but reuse the existing refresh token).
   */
  updateTokens(params: {
    accessTokenEncrypted: string;
    refreshTokenEncrypted?: string;
    tokenExpiresAt?: Date;
    scope?: string;
  }): void {
    this.accessTokenEncrypted = params.accessTokenEncrypted;
    if (params.refreshTokenEncrypted !== undefined) {
      this.refreshTokenEncrypted = params.refreshTokenEncrypted;
    }
    if (params.tokenExpiresAt !== undefined) {
      this.tokenExpiresAt = params.tokenExpiresAt;
    }
    if (params.scope !== undefined) {
      this.scope = params.scope;
    }
    this.touch();
  }

  touch(): void {
    this.updatedAt = new Date();
  }
}
