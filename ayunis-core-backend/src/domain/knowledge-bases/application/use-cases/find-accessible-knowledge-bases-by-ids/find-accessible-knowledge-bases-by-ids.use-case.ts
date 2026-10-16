import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { AccessibleKnowledgeBasesByIdsRepository } from 'src/domain/knowledge-bases/application/ports/accessible-knowledge-bases-by-ids.repository';
import type { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import type { CollectiveKnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { CollectiveKnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/collective-knowledge-base.repository';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';

@Injectable()
export class FindAccessibleKnowledgeBasesByIdsUseCase {
  private readonly logger = new Logger(
    FindAccessibleKnowledgeBasesByIdsUseCase.name,
  );

  constructor(
    private readonly repository: AccessibleKnowledgeBasesByIdsRepository,
    private readonly collectiveRepository: CollectiveKnowledgeBaseRepository,
    private readonly getViewer: GetOwnershipViewerUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: {
    knowledgeBaseIds: UUID[];
  }): Promise<Array<PersonalKnowledgeBase | CollectiveKnowledgeBase>> {
    const knowledgeBaseIds = [...new Set(query.knowledgeBaseIds)];
    this.logger.log(
      { count: knowledgeBaseIds.length },
      'Finding accessible knowledge bases by IDs',
    );
    if (knowledgeBaseIds.length === 0) return [];

    const viewer = await this.getViewer.execute();
    const [personal, collective] = await Promise.all([
      this.repository.findAccessibleByIds(
        knowledgeBaseIds,
        viewer.userId,
        viewer.orgId,
      ),
      this.collectiveRepository.findUsable(
        { userId: viewer.userId, orgId: viewer.orgId, teamIds: viewer.teamIds },
        knowledgeBaseIds,
      ),
    ]);
    const accessibleById = new Map(
      [...personal, ...collective].map((knowledgeBase) => [
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
