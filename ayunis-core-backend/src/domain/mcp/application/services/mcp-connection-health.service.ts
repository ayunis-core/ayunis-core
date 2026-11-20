import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { McpConnectionConfig } from 'src/domain/mcp/application/ports/mcp-client.port';
import { McpConnectionObservationRepositoryPort } from 'src/domain/mcp/application/ports/mcp-connection-observation.repository.port';
import type { McpConnectionObservation } from 'src/domain/mcp/domain/mcp-connection-observation';
import { mcpConnectionFailure } from 'src/domain/mcp/application/mcp-connection-failure';
import { McpRuntimeConnectionError } from 'src/domain/mcp/application/mcp-runtime-connection.error';

@Injectable()
export class McpConnectionHealthService {
  private readonly logger = new Logger(McpConnectionHealthService.name);
  constructor(
    private readonly observations: McpConnectionObservationRepositoryPort,
  ) {}

  async observe<T>(
    config: McpConnectionConfig,
    operation: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    signal?.throwIfAborted();
    const userId = config.connectionScope.userId as UUID | undefined;
    const revision = config.observationRevision;
    if (!userId || !revision) return operation();
    const startedAt = new Date();
    const observation = {
      integrationId: config.connectionScope.integrationId as UUID,
      userId,
      revision,
      startedAt,
    };
    try {
      const result = await operation();
      void this.record({
        ...observation,
        checkedAt: new Date(),
        failure: null,
      });
      signal?.throwIfAborted();
      return result;
    } catch (error) {
      signal?.throwIfAborted();
      const failure = mcpConnectionFailure(error);
      if (!failure) throw error;
      void this.record({ ...observation, checkedAt: new Date(), failure });
      const safeError = new McpRuntimeConnectionError(failure);
      throw safeError;
    }
  }

  private async record(observation: McpConnectionObservation): Promise<void> {
    try {
      await this.observations.record(observation);
    } catch {
      this.logger.warn(
        { integrationId: observation.integrationId },
        'Could not record MCP connection health',
      );
    }
  }
}
