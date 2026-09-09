import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { KnowledgeBaseContext } from 'src/domain/knowledge-bases/application/models/knowledge-base-context';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';

export type AccessibleKnowledgeBaseContext = KnowledgeBaseContext;

@Injectable()
export class GetAccessibleKnowledgeBaseContextsUseCase {
  private readonly logger = new Logger(
    GetAccessibleKnowledgeBaseContextsUseCase.name,
  );

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly readAccess: KnowledgeBaseReadAccessService,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: {
    knowledgeBaseIds: UUID[];
  }): Promise<AccessibleKnowledgeBaseContext[]> {
    const userId = this.context.get('userId');
    const orgId = this.context.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();
    const ids = [...new Set(query.knowledgeBaseIds)];
    this.logger.debug(
      { count: ids.length },
      'Resolving knowledge-base context',
    );
    if (ids.length === 0) return [];

    const knowledgeBases = await this.repository.findByIds(ids, { orgId });
    const byId = new Map(knowledgeBases.map((item) => [item.id, item]));
    const ordered = ids.flatMap((id) => {
      const knowledgeBase = byId.get(id);
      return knowledgeBase ? [knowledgeBase] : [];
    });
    await Promise.all(ordered.map((item) => this.readAccess.requireRead(item)));
    return this.withState(ordered, userId);
  }

  private async withState(
    knowledgeBases: KnowledgeBase[],
    userId: UUID,
  ): Promise<KnowledgeBaseContext[]> {
    const personalIds = knowledgeBases
      .filter((item) => item instanceof PersonalKnowledgeBase)
      .map(({ id }) => id);
    const workspaceGroups = this.groupWorkspaceIds(knowledgeBases);
    const [activePersonalIds, counts, workspaceStates] = await Promise.all([
      personalIds.length
        ? this.repository.getActiveIds(userId)
        : new Set<UUID>(),
      this.repository.countSourcesByKnowledgeBaseIds(
        knowledgeBases.map(({ id }) => id),
      ),
      this.loadWorkspaceStates(workspaceGroups),
    ]);
    return knowledgeBases.map((knowledgeBase) => ({
      knowledgeBase,
      isShared:
        knowledgeBase instanceof PersonalKnowledgeBase &&
        knowledgeBase.userId !== userId,
      isActive:
        knowledgeBase instanceof PersonalKnowledgeBase
          ? activePersonalIds.has(knowledgeBase.id)
          : (workspaceStates.get(knowledgeBase.id)?.isActive ?? false),
      documentCount: counts.get(knowledgeBase.id) ?? 0,
    }));
  }

  private groupWorkspaceIds(
    knowledgeBases: KnowledgeBase[],
  ): Map<UUID, UUID[]> {
    const groups = new Map<UUID, UUID[]>();
    for (const knowledgeBase of knowledgeBases) {
      if (knowledgeBase instanceof PersonalKnowledgeBase) continue;
      groups.set(knowledgeBase.workspaceId, [
        ...(groups.get(knowledgeBase.workspaceId) ?? []),
        knowledgeBase.id,
      ]);
    }
    return groups;
  }

  private async loadWorkspaceStates(
    groups: Map<UUID, UUID[]>,
  ): Promise<Map<UUID, { isActive: boolean }>> {
    const results = await Promise.all(
      [...groups].map(([workspaceId, ids]) =>
        this.repository.getWorkspaceStates(ids, workspaceId),
      ),
    );
    return new Map(results.flatMap((states) => [...states]));
  }
}
