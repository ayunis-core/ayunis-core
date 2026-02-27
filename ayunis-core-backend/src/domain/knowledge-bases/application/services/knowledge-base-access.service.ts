import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { KnowledgeBaseRepository } from '../ports/knowledge-base.repository';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { FindShareByEntityQuery } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.query';
import { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import { FindSharesByScopeQuery } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { KnowledgeBaseShare } from 'src/domain/shares/domain/share.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseNotFoundError } from '../knowledge-bases.errors';
import type { KnowledgeBase } from '../../domain/knowledge-base.entity';

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
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    // Try owned KB first
    const ownedKb = await this.knowledgeBaseRepository.findById(id);
    if (ownedKb?.userId === userId) {
      return ownedKb;
    }

    // If not owned, check if shared with user
    const share = await this.findShareByEntityUseCase.execute(
      new FindShareByEntityQuery(SharedEntityType.KNOWLEDGE_BASE, id),
    );

    if (share) {
      const kb = await this.knowledgeBaseRepository.findById(id);
      if (kb) {
        return kb;
      }
    }

    throw new KnowledgeBaseNotFoundError(id);
  }

  /**
   * Resolves whether a knowledge base is shared with the given user.
   * Returns false for KB owners, even if the KB has been shared.
   */
  async resolveIsShared(kbId: UUID, userId: UUID): Promise<boolean> {
    const kb = await this.knowledgeBaseRepository.findById(kbId);
    if (kb?.userId === userId) {
      return false;
    }

    const share = await this.findShareByEntityUseCase.execute(
      new FindShareByEntityQuery(SharedEntityType.KNOWLEDGE_BASE, kbId),
    );
    return share !== null;
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
      .map((s) => (s as KnowledgeBaseShare).knowledgeBaseId)
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
}
