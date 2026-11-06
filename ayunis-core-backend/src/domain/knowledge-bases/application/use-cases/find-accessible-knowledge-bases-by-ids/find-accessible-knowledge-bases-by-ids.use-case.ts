import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { AccessibleKnowledgeBasesByIdsRepository } from 'src/domain/knowledge-bases/application/ports/accessible-knowledge-bases-by-ids.repository';
import type { NonWorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { CollectiveKnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/collective-knowledge-base-access.service';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class FindAccessibleKnowledgeBasesByIdsUseCase {
  private readonly logger = new Logger(
    FindAccessibleKnowledgeBasesByIdsUseCase.name,
  );

  constructor(
    private readonly repository: AccessibleKnowledgeBasesByIdsRepository,
    private readonly contextService: ContextService,
    private readonly collectiveAccess: CollectiveKnowledgeBaseAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: {
    knowledgeBaseIds: UUID[];
  }): Promise<NonWorkspaceKnowledgeBase[]> {
    const knowledgeBaseIds = [...new Set(query.knowledgeBaseIds)];
    this.logger.log(
      { count: knowledgeBaseIds.length },
      'Finding accessible knowledge bases by IDs',
    );
    if (knowledgeBaseIds.length === 0) return [];

    const { userId } = getRequiredUserContext(this.contextService);
    const owners = await this.collectiveAccess.readableOwners();

    const accessibleKnowledgeBases = await this.repository.findAccessibleByIds(
      knowledgeBaseIds,
      { userId, ...owners },
    );
    const accessibleById = new Map(
      accessibleKnowledgeBases.map((knowledgeBase) => [
        knowledgeBase.id,
        knowledgeBase,
      ]),
    );
    return knowledgeBaseIds.flatMap((id) => {
      const knowledgeBase = accessibleById.get(id);
      return knowledgeBase ? [knowledgeBase] : [];
    });
  }
}
