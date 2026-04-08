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
 *
 * Transitional state: a parallel legacy `OAuthMcpIntegrationAuth` entity lives
 * under `domain/mcp/domain/auth/` and is only used by the legacy
 * `CreateMcpIntegrationUseCase` OAuth branch (which currently throws
 * `McpAuthNotImplementedError`). New OAuth flows use this entity plus the
 * base-class `oauthClientId` / `oauthClientSecretEncrypted` fields on
 * `McpIntegration`; the legacy entity is untouched by this task (scheduled
 * for removal in Step 7, which also deletes `McpOAuthNotSupportedError` and
 * unblocks marketplace OAuth).
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
    this.tokenExpiresAt = params.tokenExpiresAt
      ? new Date(params.tokenExpiresAt)
      : undefined;
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
   * Replaces the encrypted access token and applies a three-state update to
   * the optional related fields (`refreshTokenEncrypted`, `tokenExpiresAt`,
   * `scope`):
   *
   *   - `undefined` → preserve the current value (do not touch)
   *   - `null`      → clear the current value
   *   - concrete    → replace with the given value
   *
   * The preserve-on-omission default exists because OAuth 2.0 (RFC 6749 §6)
   * allows an authorization server to issue a refreshed access token while
   * reusing the existing refresh token — callers that only receive a new
   * access token must be able to leave the refresh token untouched.
   *
   * `tokenExpiresAt` and `scope` use the same matrix so that callers can
   * explicitly distinguish "field not present in the refresh response"
   * (preserve) from "field is now absent" (clear). A refresh response that
   * carries a new `expires_in` MUST be passed through as a concrete value to
   * avoid `isExpired()` reporting a stale expiry.
   */
  updateTokens(params: {
    accessTokenEncrypted: string;
    refreshTokenEncrypted?: string | null;
    tokenExpiresAt?: Date | null;
    scope?: string | null;
  }): void {
    this.accessTokenEncrypted = params.accessTokenEncrypted;
    if (params.refreshTokenEncrypted !== undefined) {
      this.refreshTokenEncrypted = params.refreshTokenEncrypted ?? undefined;
    }
    if (params.tokenExpiresAt !== undefined) {
      this.tokenExpiresAt = params.tokenExpiresAt
        ? new Date(params.tokenExpiresAt)
        : undefined;
    }
    if (params.scope !== undefined) {
      this.scope = params.scope ?? undefined;
    }
    this.touch();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
