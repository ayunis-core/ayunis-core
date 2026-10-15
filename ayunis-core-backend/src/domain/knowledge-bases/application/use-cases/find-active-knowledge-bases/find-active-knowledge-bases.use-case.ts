import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import type { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import type { CollectiveKnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { CollectiveKnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/collective-knowledge-base.repository';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { FindActiveKnowledgeBasesQuery } from './find-active-knowledge-bases.query';

@Injectable()
export class FindActiveKnowledgeBasesUseCase {
  private readonly logger = new Logger(FindActiveKnowledgeBasesUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly collectiveRepository: CollectiveKnowledgeBaseRepository,
    private readonly getViewer: GetOwnershipViewerUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    query: FindActiveKnowledgeBasesQuery = new FindActiveKnowledgeBasesQuery(),
  ): Promise<Array<PersonalKnowledgeBase | CollectiveKnowledgeBase>> {
    this.logger.log(query, 'Finding active knowledge bases');
    const viewer = await this.getViewer.execute();
    const [personal, collective] = await Promise.all([
      this.repository.findActiveAccessible(
        viewer.userId,
        viewer.orgId,
        query.knowledgeBaseId,
        query.sourceId,
      ),
      this.collectiveRepository.findActiveUsable(
        { userId: viewer.userId, orgId: viewer.orgId, teamIds: viewer.teamIds },
        { knowledgeBaseId: query.knowledgeBaseId, sourceId: query.sourceId },
      ),
    ]);
    return [...personal, ...collective];
  }
}
