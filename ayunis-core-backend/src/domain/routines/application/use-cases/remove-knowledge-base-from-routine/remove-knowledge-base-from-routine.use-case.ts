import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import {
  RoutineNotFoundError,
  UnexpectedRoutineError,
} from 'src/domain/routines/application/routines.errors';
import { RemoveKnowledgeBaseFromRoutineCommand } from './remove-knowledge-base-from-routine.command';

/** Works for any knowledge base, also one the user can no longer access. */
@Injectable()
export class RemoveKnowledgeBaseFromRoutineUseCase {
  private readonly logger = new Logger(
    RemoveKnowledgeBaseFromRoutineUseCase.name,
  );

  constructor(
    private readonly routinesRepository: RoutinesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  async execute(command: RemoveKnowledgeBaseFromRoutineCommand): Promise<void> {
    this.logger.log(
      {
        routineId: command.routineId,
        knowledgeBaseId: command.knowledgeBaseId,
      },
      'Removing knowledge base from routine',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    const routine = await this.routinesRepository.findById(
      userId,
      command.routineId,
    );
    if (!routine) throw new RoutineNotFoundError(command.routineId);
    await this.routinesRepository.removeKnowledgeBase(
      routine.id,
      command.knowledgeBaseId,
    );
  }
}
