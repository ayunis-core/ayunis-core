import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import {
  RoutineNotFoundError,
  UnexpectedRoutineError,
} from 'src/domain/routines/application/routines.errors';
import { RemoveMcpIntegrationFromRoutineCommand } from './remove-mcp-integration-from-routine.command';

/** Works for any integration, also an unavailable one or one not linked. */
@Injectable()
export class RemoveMcpIntegrationFromRoutineUseCase {
  private readonly logger = new Logger(
    RemoveMcpIntegrationFromRoutineUseCase.name,
  );

  constructor(
    private readonly routinesRepository: RoutinesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  async execute(
    command: RemoveMcpIntegrationFromRoutineCommand,
  ): Promise<void> {
    this.logger.log(
      { routineId: command.routineId, integrationId: command.integrationId },
      'Removing integration from routine',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    const routine = await this.routinesRepository.findById(
      userId,
      command.routineId,
    );
    if (!routine) throw new RoutineNotFoundError(command.routineId);
    await this.routinesRepository.removeMcpIntegration(
      routine.id,
      command.integrationId,
    );
  }
}
