import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import {
  RoutineNotFoundError,
  UnexpectedRoutineError,
} from 'src/domain/routines/application/routines.errors';
import { RoutineIntegrationService } from 'src/domain/routines/application/services/routine-integration.service';
import { AddMcpIntegrationToRoutineCommand } from './add-mcp-integration-to-routine.command';

/**
 * The row lock keeps the routine from being deleted before its link is
 * written. An integration the routine already has stays without a check, so
 * adding it again changes nothing even once it became unavailable.
 */
@Injectable()
export class AddMcpIntegrationToRoutineUseCase {
  private readonly logger = new Logger(AddMcpIntegrationToRoutineUseCase.name);

  constructor(
    private readonly routinesRepository: RoutinesRepository,
    private readonly routineIntegrationService: RoutineIntegrationService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  @Transactional()
  async execute(command: AddMcpIntegrationToRoutineCommand): Promise<void> {
    this.logger.log(
      { routineId: command.routineId, integrationId: command.integrationId },
      'Adding integration to routine',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    const routine = await this.routinesRepository.findByIdForUpdate(
      userId,
      command.routineId,
    );
    if (!routine) throw new RoutineNotFoundError(command.routineId);
    if (routine.mcpIntegrationIds.includes(command.integrationId)) return;
    await this.routineIntegrationService.assertAddable(command.integrationId);
    await this.routinesRepository.addMcpIntegration(
      routine.id,
      command.integrationId,
    );
  }
}
