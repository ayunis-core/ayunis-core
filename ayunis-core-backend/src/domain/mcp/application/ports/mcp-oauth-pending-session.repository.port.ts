import type { UUID } from 'crypto';
import type { McpOAuthPendingSession } from '../../domain/mcp-oauth-pending-session.entity';

export abstract class McpOAuthPendingSessionRepositoryPort {
  abstract save(
    session: McpOAuthPendingSession,
  ): Promise<McpOAuthPendingSession>;

  abstract consumeByStateHash(
    stateHash: string,
    consumedAt: Date,
  ): Promise<McpOAuthPendingSession | null>;

  abstract deleteByIntegration(integrationId: UUID): Promise<void>;
}
