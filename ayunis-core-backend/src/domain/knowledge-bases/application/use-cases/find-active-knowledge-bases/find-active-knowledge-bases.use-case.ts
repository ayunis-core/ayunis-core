import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import type { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { FindActiveKnowledgeBasesQuery } from './find-active-knowledge-bases.query';

@Injectable()
export class FindActiveKnowledgeBasesUseCase {
  private readonly logger = new Logger(FindActiveKnowledgeBasesUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    query: FindActiveKnowledgeBasesQuery = new FindActiveKnowledgeBasesQuery(),
  ): Promise<PersonalKnowledgeBase[]> {
    this.logger.log(query, 'Finding active knowledge bases');
    const { userId, orgId } = getRequiredUserContext(this.context);
    return this.repository.findActiveAccessible(
      userId,
      orgId,
      query.knowledgeBaseId,
      query.sourceId,
    );
  }
}
