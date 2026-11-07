import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import {
  RoutineNotFoundError,
  UnexpectedRoutineError,
} from 'src/domain/routines/application/routines.errors';
import { RoutineModelService } from 'src/domain/routines/application/services/routine-model.service';
import type { Routine } from 'src/domain/routines/domain/routine.entity';
import { UpdateRoutineCommand } from './update-routine.command';

@Injectable()
export class UpdateRoutineUseCase {
  private readonly logger = new Logger(UpdateRoutineUseCase.name);

  constructor(
    private readonly routinesRepository: RoutinesRepository,
    private readonly routineModelService: RoutineModelService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  async execute(command: UpdateRoutineCommand): Promise<Routine> {
    this.logger.log({ routineId: command.id }, 'Updating routine');
    const { userId } = getRequiredUserContext(this.contextService);
    const { id, modelId, ...changes } = command;
    const updated = await this.routinesRepository.updateDefinition(userId, id, {
      ...changes,
      ...(modelId && {
        modelId: await this.routineModelService.select(modelId),
      }),
    });
    if (!updated) throw new RoutineNotFoundError(id);
    return updated;
  }
}
