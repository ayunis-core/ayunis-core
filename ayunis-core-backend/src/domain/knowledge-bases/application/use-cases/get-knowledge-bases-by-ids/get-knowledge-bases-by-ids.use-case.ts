import { Inject, Injectable, Logger } from '@nestjs/common';
import { GetKnowledgeBasesByIdsQuery } from './get-knowledge-bases-by-ids.query';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import { UnexpectedKnowledgeBaseError } from '../../knowledge-bases.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

/**
 * Use case for fetching multiple knowledge bases by their IDs in a single query.
 * Used by other modules (e.g., skills) to efficiently fetch knowledge base details.
 */
@Injectable()
export class GetKnowledgeBasesByIdsUseCase {
  private readonly logger = new Logger(GetKnowledgeBasesByIdsUseCase.name);

  constructor(
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
  async execute(query: GetKnowledgeBasesByIdsQuery): Promise<KnowledgeBase[]> {
    this.logger.log('getKnowledgeBasesByIds', {
      count: query.knowledgeBaseIds.length,
    });

    try {
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
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Unexpected error getting knowledge bases by IDs', {
        error: error as Error,
      });
      throw new UnexpectedKnowledgeBaseError('Unexpected error occurred');
    }
  }
}
