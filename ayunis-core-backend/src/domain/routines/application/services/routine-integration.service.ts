import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ListAvailableMcpIntegrationsUseCase } from 'src/domain/mcp/application/use-cases/list-available-mcp-integrations/list-available-mcp-integrations.use-case';
import { DiscoverMcpCapabilitiesUseCase } from 'src/domain/mcp/application/use-cases/discover-mcp-capabilities/discover-mcp-capabilities.use-case';
import { DiscoverMcpCapabilitiesQuery } from 'src/domain/mcp/application/use-cases/discover-mcp-capabilities/discover-mcp-capabilities.query';
import { RoutineIntegrationUnavailableError } from 'src/domain/routines/application/routines.errors';
import type { Routine } from 'src/domain/routines/domain/routine.entity';

/** Which integrations a routine uses, checked against the current user's access. */
@Injectable()
export class RoutineIntegrationService {
  private readonly logger = new Logger(RoutineIntegrationService.name);

  constructor(
    private readonly listAvailableMcpIntegrationsUseCase: ListAvailableMcpIntegrationsUseCase,
    private readonly discoverMcpCapabilitiesUseCase: DiscoverMcpCapabilitiesUseCase,
  ) {}

  /**
   * An integration can only be added while it is enabled in the org and
   * connected for the user. One the routine already has stays when it becomes
   * unavailable; the run then fails until it is removed or usable again.
   */
  assertAddable(integrationId: UUID): Promise<void> {
    return this.assertAvailable([integrationId]);
  }

  /**
   * A run must not quietly go ahead without a tool it was set up to use, so
   * every integration must also answer now. The run's tool assembly then
   * reads the discovered capabilities from the cache.
   */
  async assertUsable(routine: Routine): Promise<void> {
    const integrationIds = routine.mcpIntegrationIds;
    if (integrationIds.length === 0) return;
    await this.assertAvailable(integrationIds);
    const results = await Promise.allSettled(
      integrationIds.map((id) =>
        this.discoverMcpCapabilitiesUseCase.execute(
          new DiscoverMcpCapabilitiesQuery(id),
        ),
      ),
    );
    const failedIndex = results.findIndex(
      (result) => result.status === 'rejected',
    );
    if (failedIndex === -1) return;
    const integrationId = integrationIds[failedIndex];
    const { reason } = results[failedIndex] as { reason: unknown };
    this.logger.warn(
      {
        routineId: routine.id,
        integrationId,
        error: reason instanceof Error ? reason.message : 'Unknown error',
      },
      'Routine integration unreachable',
    );
    throw new RoutineIntegrationUnavailableError(integrationId);
  }

  private async assertAvailable(integrationIds: UUID[]): Promise<void> {
    const available = await this.listAvailableMcpIntegrationsUseCase.execute();
    const usable = new Set(
      available
        .filter(({ userAuthorized }) => userAuthorized)
        .map(({ integration }) => integration.id),
    );
    const unavailable = integrationIds.find((id) => !usable.has(id));
    if (unavailable) throw new RoutineIntegrationUnavailableError(unavailable);
  }
}
