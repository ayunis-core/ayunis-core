import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  KnowledgeBaseRepository,
  type KnowledgeBaseListOptions,
} from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { FindShareByEntityQuery } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.query';
import { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import { FindSharesByScopeQuery } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.query';
import { CheckKnowledgeBaseSkillShareAccessUseCase } from 'src/domain/skills/application/use-cases/check-knowledge-base-skill-share-access/check-knowledge-base-skill-share-access.use-case';
import { CheckKnowledgeBaseSkillShareAccessQuery } from 'src/domain/skills/application/use-cases/check-knowledge-base-skill-share-access/check-knowledge-base-skill-share-access.query';
import { FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase } from 'src/domain/skills/application/use-cases/find-knowledge-base-ids-accessible-via-shared-skills/find-knowledge-base-ids-accessible-via-shared-skills.use-case';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { Paginated } from 'src/common/pagination/paginated.entity';

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
    private readonly checkKnowledgeBaseSkillShareAccessUseCase: CheckKnowledgeBaseSkillShareAccessUseCase,
    private readonly findKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase: FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase,
    private readonly contextService: ContextService,
  ) {}

  async findAccessibleKnowledgeBase(id: UUID): Promise<KnowledgeBase> {
    return this.findAccessibleKnowledgeBaseForUser(id, this.getUserId());
  }

  async findOneAccessible(id: UUID): Promise<KnowledgeBaseWithShareStatus> {
    const userId = this.getUserId();
    const knowledgeBase = await this.findAccessibleKnowledgeBaseForUser(
      id,
      userId,
    );
    return {
      knowledgeBase,
      isShared: knowledgeBase.userId !== userId,
    };
  }

  /**
   * Counts sources for multiple knowledge bases in one repository operation.
   */
  async countSourcesByKnowledgeBaseIds(
    knowledgeBaseIds: UUID[],
  ): Promise<Map<UUID, number>> {
    if (knowledgeBaseIds.length === 0) {
      return new Map();
    }
    return this.knowledgeBaseRepository.countSourcesByKnowledgeBaseIds(
      knowledgeBaseIds,
    );
  }

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
    const [ownedKbs, sharedKnowledgeBaseIds] = await Promise.all([
      this.knowledgeBaseRepository.findAllByUserId(userId),
      this.findAccessibleSharedKnowledgeBaseIds(),
    ]);

    const ownedKbIds = new Set(ownedKbs.map((kb) => kb.id));

    this.logger.debug(
      {
        count: ownedKbs.length,
      },
      'Found owned knowledge bases',
    );

    // 2. Extract shared KB IDs and deduplicate against owned
    const sharedKbIds = sharedKnowledgeBaseIds.filter(
      (id) => !ownedKbIds.has(id),
    );

    this.logger.debug(
      {
        count: sharedKbIds.length,
      },
      'Found shared knowledge bases after deduplication',
    );

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

  async findAllAccessiblePaginated(
    workspaceId: UUID | undefined,
    options: KnowledgeBaseListOptions,
  ): Promise<Paginated<KnowledgeBaseWithShareStatus>> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    const sharedIds = await this.findAccessibleSharedKnowledgeBaseIds();
    const page = await this.knowledgeBaseRepository.findPaginatedAccessible(
      userId,
      workspaceId,
      sharedIds,
      options,
    );
    const sharedIdSet = new Set(sharedIds);

    return new Paginated({
      data: page.data.map((knowledgeBase) => ({
        knowledgeBase,
        isShared:
          knowledgeBase.userId !== userId && sharedIdSet.has(knowledgeBase.id),
      })),
      limit: page.limit,
      offset: page.offset,
      total: page.total,
    });
  }

  private getUserId(): UUID {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    return userId;
  }

  private async findAccessibleKnowledgeBaseForUser(
    id: UUID,
    userId: UUID,
  ): Promise<KnowledgeBase> {
    const knowledgeBase = await this.knowledgeBaseRepository.findById(id);
    if (!knowledgeBase) {
      throw new KnowledgeBaseNotFoundError(id);
    }
    if (knowledgeBase.userId === userId) {
      return knowledgeBase;
    }

    const directShare = await this.findShareByEntityUseCase.execute(
      new FindShareByEntityQuery(SharedEntityType.KNOWLEDGE_BASE, id),
    );
    if (directShare) {
      return knowledgeBase;
    }

    const isAccessibleViaSkill =
      await this.checkKnowledgeBaseSkillShareAccessUseCase.execute(
        new CheckKnowledgeBaseSkillShareAccessQuery(id, knowledgeBase.userId),
      );
    if (isAccessibleViaSkill) {
      return knowledgeBase;
    }

    throw new KnowledgeBaseNotFoundError(id);
  }

  private async findAccessibleSharedKnowledgeBaseIds(): Promise<UUID[]> {
    const [directShares, skillSharedIds] = await Promise.all([
      this.findSharesByScopeUseCase.execute(
        new FindSharesByScopeQuery(SharedEntityType.KNOWLEDGE_BASE),
      ),
      this.findKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase.execute(),
    ]);

    return [
      ...new Set([
        ...directShares.map((share) => share.entityId),
        ...skillSharedIds,
      ]),
    ];
  }
}
