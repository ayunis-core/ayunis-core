import { Inject, Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GetKnowledgeBasesByIdsQuery } from './get-knowledge-bases-by-ids.query';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

/**
 * Use case for fetching multiple knowledge bases by their IDs in a single query.
 * Used by other modules (e.g., skills) to efficiently fetch knowledge base details.
 */
@Injectable()
export class GetKnowledgeBasesByIdsUseCase {
  constructor(
    @InjectPinoLogger(GetKnowledgeBasesByIdsUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(KnowledgeBaseRepository)
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Fetches multiple knowledge bases by their IDs.
   * Only returns knowledge bases belonging to the user's organization.
   * @param query Query containing the knowledge base IDs
   * @returns Array of KnowledgeBase entities (missing/unauthorized IDs omitted)
   */
  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: GetKnowledgeBasesByIdsQuery): Promise<KnowledgeBase[]> {
    this.logger.info(
      {
        count: query.knowledgeBaseIds.length,
      },
      'getKnowledgeBasesByIds',
    );

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    if (query.knowledgeBaseIds.length === 0) {
      return [];
    }

    const knowledgeBases = await this.knowledgeBaseRepository.findByIds(
      query.knowledgeBaseIds,
    );

    return knowledgeBases.filter((kb) => kb.orgId === orgId);
  }
}
