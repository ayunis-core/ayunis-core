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
 * `McpIntegration`; the legacy entity is untouched by this task.
 */
export class McpIntegrationOAuthToken {
  public readonly id: UUID;
  public readonly integrationId: UUID;
  public readonly userId: UUID | null;
  public readonly createdAt: Date;
  public updatedAt: Date;

  /**
   * The four token fields below are encapsulated as private backing fields
   * with public read-only getters so that direct field assignment cannot
   * bypass {@link updateTokens}'s tri-state semantics or skip the
   * `touch()` bookkeeping. The single writer is `updateTokens()`.
   */
  private _accessTokenEncrypted: string;
  private _refreshTokenEncrypted?: string;
  private _tokenExpiresAt?: Date;
  private _scope?: string;

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
    this._accessTokenEncrypted = params.accessTokenEncrypted;
    this._refreshTokenEncrypted = params.refreshTokenEncrypted;
    this._tokenExpiresAt = params.tokenExpiresAt
      ? new Date(params.tokenExpiresAt)
      : undefined;
    this._scope = params.scope;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  get accessTokenEncrypted(): string {
    return this._accessTokenEncrypted;
  }

  get refreshTokenEncrypted(): string | undefined {
    return this._refreshTokenEncrypted;
  }

  /**
   * Returns a fresh `Date` so callers cannot mutate the entity's internal
   * state via the returned reference. Mirrors the defensive copy already
   * applied on the input side in the constructor and {@link updateTokens}.
   */
  get tokenExpiresAt(): Date | undefined {
    return this._tokenExpiresAt ? new Date(this._tokenExpiresAt) : undefined;
  }

  get scope(): string | undefined {
    return this._scope;
  }

  /**
   * Returns true when the access token has a known expiry that is at or
   * before `now`. Tokens without an expiry are treated as non-expiring
   * (matches OAuth providers that issue long-lived tokens with no `expires_in`).
   */
  isExpired(now: Date = new Date()): boolean {
    if (!this._tokenExpiresAt) {
      return false;
    }
    return this._tokenExpiresAt.getTime() <= now.getTime();
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
    this._accessTokenEncrypted = params.accessTokenEncrypted;
    if (params.refreshTokenEncrypted !== undefined) {
      this._refreshTokenEncrypted = params.refreshTokenEncrypted ?? undefined;
    }
    if (params.tokenExpiresAt !== undefined) {
      this._tokenExpiresAt = params.tokenExpiresAt
        ? new Date(params.tokenExpiresAt)
        : undefined;
    }
    if (params.scope !== undefined) {
      this._scope = params.scope ?? undefined;
    }
    this.touch();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
