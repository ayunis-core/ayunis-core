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
import { RoutineKnowledgeBaseService } from 'src/domain/routines/application/services/routine-knowledge-base.service';
import { AddKnowledgeBaseToRoutineCommand } from './add-knowledge-base-to-routine.command';

/** The row lock keeps the routine from being deleted before its link is written. */
@Injectable()
export class AddKnowledgeBaseToRoutineUseCase {
  private readonly logger = new Logger(AddKnowledgeBaseToRoutineUseCase.name);

  constructor(
    private readonly routinesRepository: RoutinesRepository,
    private readonly routineKnowledgeBaseService: RoutineKnowledgeBaseService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  @Transactional()
  async execute(command: AddKnowledgeBaseToRoutineCommand): Promise<void> {
    this.logger.log(
      {
        routineId: command.routineId,
        knowledgeBaseId: command.knowledgeBaseId,
      },
      'Adding knowledge base to routine',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    const routine = await this.routinesRepository.findByIdForUpdate(
      userId,
      command.routineId,
    );
    if (!routine) throw new RoutineNotFoundError(command.routineId);
    await this.routineKnowledgeBaseService.assertAddable(
      command.knowledgeBaseId,
    );
    await this.routinesRepository.addKnowledgeBase(
      routine.id,
      command.knowledgeBaseId,
    );
  }
}
