import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { KnowledgeBaseRepository } from '../ports/knowledge-base.repository';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { FindShareByEntityQuery } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.query';
import { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import { FindSharesByScopeQuery } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseNotFoundError } from '../knowledge-bases.errors';
import type { KnowledgeBase } from '../../domain/knowledge-base.entity';
import type { Source } from 'src/domain/sources/domain/source.entity';

export interface KnowledgeBaseWithShareStatus {
  knowledgeBase: KnowledgeBase;
  isShared: boolean;
}

@Injectable()
export class KnowledgeBaseAccessService {
  private readonly logger = new Logger(KnowledgeBaseAccessService.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly findShareByEntityUseCase: FindShareByEntityUseCase,
    private readonly findSharesByScopeUseCase: FindSharesByScopeUseCase,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Finds a knowledge base accessible to the current user (owned or shared).
   * Throws KnowledgeBaseNotFoundError if the KB doesn't exist or isn't accessible.
   */
  async findAccessibleKnowledgeBase(id: UUID): Promise<KnowledgeBase> {
    const result = await this.findAccessibleKnowledgeBaseWithStatus(id);
    return result.knowledgeBase;
  }

  /**
   * Finds a knowledge base accessible to the current user (owned or shared)
   * and returns it with share status in a single pass.
   * Throws KnowledgeBaseNotFoundError if the KB doesn't exist or isn't accessible.
   */
  async findAccessibleKnowledgeBaseWithStatus(
    id: UUID,
  ): Promise<KnowledgeBaseWithShareStatus> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    const kb = await this.knowledgeBaseRepository.findById(id);
    if (!kb) {
      throw new KnowledgeBaseNotFoundError(id);
    }

    if (kb.userId === userId) {
      return { knowledgeBase: kb, isShared: false };
    }

    const share = await this.findShareByEntityUseCase.execute(
      new FindShareByEntityQuery(SharedEntityType.KNOWLEDGE_BASE, id),
    );

    if (share) {
      return { knowledgeBase: kb, isShared: true };
    }

    throw new KnowledgeBaseNotFoundError(id);
  }

  /**
   * Finds all knowledge bases accessible to the current user (owned + shared).
   * Returns each KB with an isShared flag.
   */
  async findAllAccessible(): Promise<KnowledgeBaseWithShareStatus[]> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    // 1. Fetch owned KBs and shares in parallel
    const [ownedKbs, shares] = await Promise.all([
      this.knowledgeBaseRepository.findAllByUserId(userId),
      this.findSharesByScopeUseCase.execute(
        new FindSharesByScopeQuery(SharedEntityType.KNOWLEDGE_BASE),
      ),
    ]);

    const ownedKbIds = new Set(ownedKbs.map((kb) => kb.id));

    this.logger.debug('Found owned knowledge bases', {
      count: ownedKbs.length,
    });

    // 2. Extract shared KB IDs and deduplicate against owned
    const sharedKbIds = shares
      .map((s) => s.entityId)
      .filter((id) => !ownedKbIds.has(id));

    this.logger.debug('Found shared knowledge bases after deduplication', {
      count: sharedKbIds.length,
    });

    // 3. Fetch shared KBs
    const sharedKbs =
      sharedKbIds.length > 0
        ? await this.knowledgeBaseRepository.findByIds(sharedKbIds)
        : [];

    // 4. Combine results with isShared flag
    const ownedResults: KnowledgeBaseWithShareStatus[] = ownedKbs.map(
      (knowledgeBase) => ({
        knowledgeBase,
        isShared: false,
      }),
    );

    const sharedResults: KnowledgeBaseWithShareStatus[] = sharedKbs.map(
      (knowledgeBase) => ({
        knowledgeBase,
        isShared: true,
      }),
    );

    return [...ownedResults, ...sharedResults];
  }

  /**
   * Lists all documents in a knowledge base accessible to the current user.
   * Validates access (owned or shared) before returning documents.
   */
  async listAccessibleDocuments(knowledgeBaseId: UUID): Promise<Source[]> {
    await this.findAccessibleKnowledgeBase(knowledgeBaseId);
    return this.knowledgeBaseRepository.findSourcesByKnowledgeBaseId(
      knowledgeBaseId,
    );
  }
}
