import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import type { KnowledgeBaseContext } from 'src/domain/knowledge-bases/application/models/knowledge-base-context';
import { GetAccessibleKnowledgeBaseContextsUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-accessible-knowledge-base-contexts/get-accessible-knowledge-base-contexts.use-case';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import {
  RoutineNotFoundError,
  UnexpectedRoutineError,
} from 'src/domain/routines/application/routines.errors';
import { RoutineKnowledgeBaseService } from 'src/domain/routines/application/services/routine-knowledge-base.service';
import { ListRoutineKnowledgeBasesQuery } from './list-routine-knowledge-bases.query';

/** Only the linked knowledge bases the user can still access. */
@Injectable()
export class ListRoutineKnowledgeBasesUseCase {
  private readonly logger = new Logger(ListRoutineKnowledgeBasesUseCase.name);

  constructor(
    private readonly routinesRepository: RoutinesRepository,
    private readonly routineKnowledgeBaseService: RoutineKnowledgeBaseService,
    private readonly getAccessibleKnowledgeBaseContextsUseCase: GetAccessibleKnowledgeBaseContextsUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  async execute(
    query: ListRoutineKnowledgeBasesQuery,
  ): Promise<KnowledgeBaseContext[]> {
    this.logger.log(
      { routineId: query.routineId },
      'Listing routine knowledge bases',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    const routine = await this.routinesRepository.findById(
      userId,
      query.routineId,
    );
    if (!routine) throw new RoutineNotFoundError(query.routineId);
    const accessible = await this.routineKnowledgeBaseService.accessible(
      routine.knowledgeBaseIds,
    );
    return this.getAccessibleKnowledgeBaseContextsUseCase.execute({
      knowledgeBaseIds: accessible.map(({ id }) => id),
    });
  }
}
