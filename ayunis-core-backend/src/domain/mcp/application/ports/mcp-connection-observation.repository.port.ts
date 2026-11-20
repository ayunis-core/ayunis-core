import type { UUID } from 'crypto';
import type { McpConnectionObservation } from 'src/domain/mcp/domain/mcp-connection-observation';

export abstract class McpConnectionObservationRepositoryPort {
  abstract record(observation: McpConnectionObservation): Promise<void>;
  abstract findForUser(
    integrationIds: UUID[],
    userId: UUID,
  ): Promise<McpConnectionObservation[]>;
}
