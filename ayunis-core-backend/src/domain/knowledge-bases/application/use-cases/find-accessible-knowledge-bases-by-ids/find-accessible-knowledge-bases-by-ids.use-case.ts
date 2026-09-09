import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { AccessibleKnowledgeBasesByIdsRepository } from 'src/domain/knowledge-bases/application/ports/accessible-knowledge-bases-by-ids.repository';
import type { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class FindAccessibleKnowledgeBasesByIdsUseCase {
  private readonly logger = new Logger(
    FindAccessibleKnowledgeBasesByIdsUseCase.name,
  );

  constructor(
    private readonly repository: AccessibleKnowledgeBasesByIdsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: {
    knowledgeBaseIds: UUID[];
  }): Promise<PersonalKnowledgeBase[]> {
    const knowledgeBaseIds = [...new Set(query.knowledgeBaseIds)];
    this.logger.log(
      { count: knowledgeBaseIds.length },
      'Finding accessible knowledge bases by IDs',
    );
    if (knowledgeBaseIds.length === 0) return [];

    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();

    const accessibleKnowledgeBases = await this.repository.findAccessibleByIds(
      knowledgeBaseIds,
      userId,
      orgId,
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
