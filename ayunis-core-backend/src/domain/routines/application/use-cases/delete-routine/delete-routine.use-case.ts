import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import {
  RoutineNotFoundError,
  UnexpectedRoutineError,
} from 'src/domain/routines/application/routines.errors';
import { DeleteRoutineCommand } from './delete-routine.command';

/** The routine's threads stay; they lose their link to it (ON DELETE SET NULL). */
@Injectable()
export class DeleteRoutineUseCase {
  private readonly logger = new Logger(DeleteRoutineUseCase.name);

  constructor(
    private readonly routinesRepository: RoutinesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  async execute(command: DeleteRoutineCommand): Promise<void> {
    this.logger.log({ routineId: command.id }, 'Deleting routine');
    const { userId } = getRequiredUserContext(this.contextService);
    if (!(await this.routinesRepository.delete(userId, command.id))) {
      throw new RoutineNotFoundError(command.id);
    }
  }
}
