import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { ShareAuthorizationStrategy } from 'src/domain/shares/application/ports/share-authorization-strategy.port';
import { KnowledgeBaseRepository } from '../ports/knowledge-base.repository';

/**
 * Knowledge-base-specific implementation of share authorization.
 * Validates that users can only manage shares for knowledge bases they own.
 */
@Injectable()
export class KnowledgeBaseShareAuthorizationStrategy implements ShareAuthorizationStrategy {
  constructor(
    @InjectPinoLogger(KnowledgeBaseShareAuthorizationStrategy.name)
    private readonly logger: PinoLogger,
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  /**
   * Check if a user can view shares for a knowledge base.
   * User must own the knowledge base to view its shares.
   */
  async canViewShares(knowledgeBaseId: UUID, userId: UUID): Promise<boolean> {
    this.logger.info({ knowledgeBaseId, userId }, 'canViewShares');

    const kb = await this.knowledgeBaseRepository.findById(knowledgeBaseId);
    return kb !== null && kb.userId === userId;
  }

  /**
   * Check if a user can create a share for a knowledge base.
   * User must own the knowledge base to create shares for it.
   */
  async canCreateShare(knowledgeBaseId: UUID, userId: UUID): Promise<boolean> {
    this.logger.info({ knowledgeBaseId, userId }, 'canCreateShare');

    const kb = await this.knowledgeBaseRepository.findById(knowledgeBaseId);
    return kb !== null && kb.userId === userId;
  }

  /**
   * Check if a user can delete a share.
   * For knowledge base shares, this is handled at the share level by checking ownerId.
   */
  canDeleteShare(shareId: UUID, userId: UUID): Promise<boolean> {
    this.logger.info({ shareId, userId }, 'canDeleteShare');

    return Promise.resolve(true);
  }
}
