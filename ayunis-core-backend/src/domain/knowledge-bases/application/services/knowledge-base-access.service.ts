import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    @InjectPinoLogger(KnowledgeBaseAccessService.name)
    private readonly logger: PinoLogger,
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly findShareByEntityUseCase: FindShareByEntityUseCase,
    private readonly findSharesByScopeUseCase: FindSharesByScopeUseCase,
    private readonly checkKnowledgeBaseSkillShareAccessUseCase: CheckKnowledgeBaseSkillShareAccessUseCase,
    private readonly findKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase: FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Finds a knowledge base accessible to the current user (owned, shared, or
   * linked to a skill shared with the user).
   * Throws KnowledgeBaseNotFoundError if the KB doesn't exist or isn't accessible.
   */
  async findAccessibleKnowledgeBase(id: UUID): Promise<KnowledgeBase> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    // Try owned KB first
    const kb = await this.knowledgeBaseRepository.findById(id);
    if (kb?.userId === userId) {
      return kb;
    }

    if (!kb) {
      throw new KnowledgeBaseNotFoundError(id);
    }

    // If not owned, check if shared with user
    const share = await this.findShareByEntityUseCase.execute(
      new FindShareByEntityQuery(SharedEntityType.KNOWLEDGE_BASE, id),
    );

    if (share) {
      return kb;
    }

    // Sharing a skill implicitly grants read access to the owner's linked KBs
    const accessibleViaSkill =
      await this.checkKnowledgeBaseSkillShareAccessUseCase.execute(
        new CheckKnowledgeBaseSkillShareAccessQuery(id, kb.userId),
      );

    if (accessibleViaSkill) {
      return kb;
    }

    throw new KnowledgeBaseNotFoundError(id);
  }

  /**
   * Finds a single knowledge base accessible to the current user and resolves
   * its shared status in one pass (single findById call).
   * Throws KnowledgeBaseNotFoundError if the KB doesn't exist or isn't accessible.
   */
  async findOneAccessible(id: UUID): Promise<KnowledgeBaseWithShareStatus> {
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
