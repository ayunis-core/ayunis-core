import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { GetMcpIntegrationsByIdsUseCase } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.use-case';
import { GetMcpIntegrationsByIdsQuery } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.query';
import type { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import {
  RoutineNotFoundError,
  UnexpectedRoutineError,
} from 'src/domain/routines/application/routines.errors';
import { ListRoutineMcpIntegrationsQuery } from './list-routine-mcp-integrations.query';

/** Includes linked integrations that are disabled or not connected. */
@Injectable()
export class ListRoutineMcpIntegrationsUseCase {
  private readonly logger = new Logger(ListRoutineMcpIntegrationsUseCase.name);

  constructor(
    private readonly routinesRepository: RoutinesRepository,
    private readonly getMcpIntegrationsByIdsUseCase: GetMcpIntegrationsByIdsUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  async execute(
    query: ListRoutineMcpIntegrationsQuery,
  ): Promise<McpIntegration[]> {
    this.logger.log(
      { routineId: query.routineId },
      'Listing routine integrations',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    const routine = await this.routinesRepository.findById(
      userId,
      query.routineId,
    );
    if (!routine) throw new RoutineNotFoundError(query.routineId);
    if (routine.mcpIntegrationIds.length === 0) return [];
    return this.getMcpIntegrationsByIdsUseCase.execute(
      new GetMcpIntegrationsByIdsQuery(routine.mcpIntegrationIds),
    );
  }
}
