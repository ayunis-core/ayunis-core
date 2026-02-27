import { Inject, Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { ShareAuthorizationStrategy } from 'src/domain/shares/application/ports/share-authorization-strategy.port';
import { KnowledgeBaseRepository } from '../ports/knowledge-base.repository';

/**
 * Knowledge-base-specific implementation of share authorization.
 * Validates that users can only manage shares for knowledge bases they own.
 */
@Injectable()
export class KnowledgeBaseShareAuthorizationStrategy
  implements ShareAuthorizationStrategy
{
  private readonly logger = new Logger(
    KnowledgeBaseShareAuthorizationStrategy.name,
  );

  constructor(
    @Inject(KnowledgeBaseRepository)
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  /**
   * Check if a user can view shares for a knowledge base.
   * User must own the knowledge base to view its shares.
   */
  async canViewShares(knowledgeBaseId: UUID, userId: UUID): Promise<boolean> {
    this.logger.log('canViewShares', { knowledgeBaseId, userId });

    const knowledgeBase =
      await this.knowledgeBaseRepository.findById(knowledgeBaseId);
    return knowledgeBase !== null && knowledgeBase.userId === userId;
  }

  /**
   * Check if a user can create a share for a knowledge base.
   * User must own the knowledge base to create shares for it.
   */
  async canCreateShare(knowledgeBaseId: UUID, userId: UUID): Promise<boolean> {
    this.logger.log('canCreateShare', { knowledgeBaseId, userId });

    const knowledgeBase =
      await this.knowledgeBaseRepository.findById(knowledgeBaseId);
    return knowledgeBase !== null && knowledgeBase.userId === userId;
  }

  /**
   * Check if a user can delete a share.
   * For knowledge base shares, this is handled at the share level by checking ownerId.
   */
  canDeleteShare(shareId: UUID, userId: UUID): Promise<boolean> {
    this.logger.log('canDeleteShare', { shareId, userId });

    return Promise.resolve(true);
  }
}
