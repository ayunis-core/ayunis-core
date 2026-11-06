import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import type { NonWorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { CollectiveKnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/collective-knowledge-base-access.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { FindActiveKnowledgeBasesQuery } from './find-active-knowledge-bases.query';

@Injectable()
export class FindActiveKnowledgeBasesUseCase {
  private readonly logger = new Logger(FindActiveKnowledgeBasesUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly context: ContextService,
    private readonly collectiveAccess: CollectiveKnowledgeBaseAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    query: FindActiveKnowledgeBasesQuery = new FindActiveKnowledgeBasesQuery(),
  ): Promise<NonWorkspaceKnowledgeBase[]> {
    this.logger.log(query, 'Finding active knowledge bases');
    const { userId } = getRequiredUserContext(this.context);
    const owners = await this.collectiveAccess.readableOwners();
    return this.repository.findActiveAccessible(
      { userId, ...owners },
      { knowledgeBaseId: query.knowledgeBaseId, sourceId: query.sourceId },
    );
  }
}
