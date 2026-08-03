import type { UUID } from 'crypto';
import type { McpOAuthUserToken } from '../../domain/mcp-oauth-user-token.entity';

export type SaveLockedMcpOAuthUserToken = (
  token: McpOAuthUserToken,
) => Promise<McpOAuthUserToken>;

export type DeleteLockedMcpOAuthUserToken = () => Promise<void>;

export type LockedMcpOAuthTokenOperation<T> = (
  currentToken: McpOAuthUserToken | null,
  save: SaveLockedMcpOAuthUserToken,
  deleteLocked: DeleteLockedMcpOAuthUserToken,
) => Promise<T>;

export abstract class McpOAuthUserTokenRepositoryPort {
  abstract findByIntegrationAndUser(
    integrationId: UUID,
    userId: UUID,
  ): Promise<McpOAuthUserToken | null>;

  abstract save(token: McpOAuthUserToken): Promise<McpOAuthUserToken>;

  abstract withLockedToken<T>(
    integrationId: UUID,
    userId: UUID,
    operation: LockedMcpOAuthTokenOperation<T>,
  ): Promise<T>;

  abstract delete(integrationId: UUID, userId: UUID): Promise<void>;

  abstract deleteByIntegration(integrationId: UUID): Promise<void>;
}
