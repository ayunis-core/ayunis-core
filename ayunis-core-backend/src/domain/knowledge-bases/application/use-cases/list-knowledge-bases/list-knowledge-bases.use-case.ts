import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type {
  KnowledgeBaseContext,
  KnowledgeBaseWithUserContext,
} from 'src/domain/knowledge-bases/application/models/knowledge-base-context';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import {
  KnowledgeBaseRepository,
  type KnowledgeBaseListOptions,
} from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import type {
  CollectiveKnowledgeBase,
  KnowledgeBase,
} from 'src/domain/knowledge-bases/domain/knowledge-base';
import {
  CollectiveKnowledgeBaseRepository,
  type CollectiveKnowledgeBaseScope,
} from 'src/domain/knowledge-bases/application/ports/collective-knowledge-base.repository';
import { isCollectiveKnowledgeBase } from 'src/domain/knowledge-bases/application/models/collective-knowledge-base-owner';
import { KnowledgeBaseOwnershipContextService } from 'src/domain/knowledge-bases/application/services/knowledge-base-ownership-context.service';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import type { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { FindSharesByScopeQuery } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.query';
import { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase } from 'src/domain/skills/application/use-cases/find-knowledge-base-ids-accessible-via-shared-skills/find-knowledge-base-ids-accessible-via-shared-skills.use-case';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { ListKnowledgeBasesQuery } from './list-knowledge-bases.query';
import { getRequiredUserContext } from 'src/common/context/required-context';

const DEFAULT_OFFSET = 0;

@Injectable()
export class ListKnowledgeBasesUseCase {
  private readonly logger = new Logger(ListKnowledgeBasesUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly findShares: FindSharesByScopeUseCase,
    private readonly findSkillSharedIds: FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase,
    private readonly context: ContextService,
    private readonly collectiveRepository: CollectiveKnowledgeBaseRepository,
    private readonly ownershipContext: KnowledgeBaseOwnershipContextService,
    private readonly getViewer: GetOwnershipViewerUseCase,
    @Inject(forwardRef(() => AssertWorkspaceReadAccessUseCase))
    private readonly workspaceRead: AssertWorkspaceReadAccessUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    query: ListKnowledgeBasesQuery,
  ): Promise<Paginated<KnowledgeBaseContext>> {
    const { userId, orgId } = this.requirePrincipal();
    this.logger.log({ ownerType: query.owner.type }, 'Listing knowledge bases');
    const page = await this.findPage(query, userId, orgId);
    const counts = await this.repository.countSourcesByKnowledgeBaseIds(
      page.data.map(({ knowledgeBase }) => knowledgeBase.id),
    );
    return new Paginated({
      data: page.data.map((item) => ({
        ...item,
        documentCount: counts.get(item.knowledgeBase.id) ?? 0,
      })),
      limit: page.limit,
      offset: page.offset,
      total: page.total,
    });
  }

  private async findPage(
    query: ListKnowledgeBasesQuery,
    userId: UUID,
    orgId: UUID,
  ): Promise<Paginated<KnowledgeBaseWithUserContext>> {
    if (query.owner.type === 'workspace') {
      await this.workspaceRead.execute({
        workspaceId: query.owner.workspaceId,
      });
      return this.hasExplicitPaging(query)
        ? this.findWorkspacePaginated(
            query.owner.workspaceId,
            userId,
            this.paginationOptions(query),
          )
        : this.findAllWorkspace(query.owner.workspaceId);
    }
    return this.findPersonal(query, userId, orgId);
  }

  private async findPersonal(
    query: ListKnowledgeBasesQuery,
    userId: UUID,
    orgId: UUID,
  ): Promise<Paginated<KnowledgeBaseWithUserContext>> {
    const [viewer, sharedIds, activeIds] = await Promise.all([
      this.getViewer.execute(),
      this.findAccessibleSharedIds(),
      this.repository.getActiveIds(userId),
    ]);
    const scope = { userId, orgId, teamIds: viewer.teamIds };
    const page = this.hasExplicitPaging(query)
      ? await this.repository.findPaginatedAccessible(
          userId,
          undefined,
          sharedIds,
          { ...this.paginationOptions(query), collective: scope },
        )
      : await this.findAllPersonal(scope, sharedIds);
    const ownership = await this.ownershipContext.lookup(page.data, viewer);
    const sharedIdSet = new Set(sharedIds);
    return this.mapPage(page, (knowledgeBase) => ({
      knowledgeBase,
      isShared:
        knowledgeBase instanceof PersonalKnowledgeBase &&
        knowledgeBase.userId !== userId &&
        sharedIdSet.has(knowledgeBase.id),
      isActive: isCollectiveKnowledgeBase(knowledgeBase)
        ? ownership.isActive(knowledgeBase)
        : activeIds.has(knowledgeBase.id),
      viewer: ownership.rightsFor(knowledgeBase),
      ownerDescription: ownership.describe(knowledgeBase),
    }));
  }

  private async findAllPersonal(
    scope: CollectiveKnowledgeBaseScope,
    sharedIds: UUID[],
  ): Promise<Paginated<PersonalKnowledgeBase | CollectiveKnowledgeBase>> {
    const [owned, collective] = await Promise.all([
      this.repository.findAllByUserId(scope.userId),
      this.collectiveRepository.findUsable(scope),
    ]);
    const ownedIds = new Set(owned.map(({ id }) => id));
    const ids = sharedIds.filter((id) => !ownedIds.has(id));
    const shared = ids.length
      ? await this.repository.findByIds(ids, {
          orgId: scope.orgId,
          workspaceId: null,
        })
      : [];
    const data = [...owned, ...shared, ...collective].sort((left, right) =>
      this.compareByNameAndId(left, right),
    );
    return new Paginated({
      data,
      limit: data.length,
      offset: 0,
      total: data.length,
    });
  }

  private async findAllWorkspace(
    workspaceId: UUID,
  ): Promise<Paginated<KnowledgeBaseWithUserContext<WorkspaceKnowledgeBase>>> {
    const knowledgeBases =
      await this.repository.findAllByWorkspaceId(workspaceId);
    const states = await this.repository.getWorkspaceStates(
      knowledgeBases.map(({ id }) => id),
      workspaceId,
    );
    return this.unpaginated(
      knowledgeBases.map((knowledgeBase) => ({
        knowledgeBase,
        isShared: false,
        isActive: states.get(knowledgeBase.id)?.isActive ?? false,
      })),
    );
  }

  private async findWorkspacePaginated(
    workspaceId: UUID,
    userId: UUID,
    options: KnowledgeBaseListOptions,
  ): Promise<Paginated<KnowledgeBaseWithUserContext<WorkspaceKnowledgeBase>>> {
    const page = await this.repository.findPaginatedAccessible(
      userId,
      workspaceId,
      [],
      options,
    );
    const states = await this.repository.getWorkspaceStates(
      page.data.map(({ id }) => id),
      workspaceId,
    );
    return this.mapPage(page, (knowledgeBase) => ({
      knowledgeBase,
      isShared: false,
      isActive: states.get(knowledgeBase.id)?.isActive ?? false,
    }));
  }

  private async findAccessibleSharedIds(): Promise<UUID[]> {
    const [shares, skillIds] = await Promise.all([
      this.findShares.execute(
        new FindSharesByScopeQuery(SharedEntityType.KNOWLEDGE_BASE),
      ),
      this.findSkillSharedIds.execute(),
    ]);
    return [
      ...new Set([...shares.map(({ entityId }) => entityId), ...skillIds]),
    ];
  }

  private unpaginated<T extends KnowledgeBaseWithUserContext>(
    data: T[],
  ): Paginated<T> {
    data.sort((left, right) =>
      this.compareByNameAndId(left.knowledgeBase, right.knowledgeBase),
    );
    return new Paginated({
      data,
      limit: data.length,
      offset: 0,
      total: data.length,
    });
  }

  private mapPage<T extends KnowledgeBase>(
    page: Paginated<T>,
    map: (knowledgeBase: T) => KnowledgeBaseWithUserContext<T>,
  ): Paginated<KnowledgeBaseWithUserContext<T>> {
    return new Paginated({
      data: page.data.map(map),
      limit: page.limit,
      offset: page.offset,
      total: page.total,
    });
  }

  private compareByNameAndId(
    left: KnowledgeBase,
    right: KnowledgeBase,
  ): number {
    const byName = left.name.localeCompare(right.name, undefined, {
      sensitivity: 'base',
    });
    return byName || left.id.localeCompare(right.id);
  }

  private paginationOptions(query: ListKnowledgeBasesQuery) {
    return {
      search: query.search,
      limit: query.limit ?? KnowledgeBasesConstants.DEFAULT_LIST_LIMIT,
      offset: query.offset ?? DEFAULT_OFFSET,
    };
  }

  private hasExplicitPaging(query: ListKnowledgeBasesQuery): boolean {
    return (
      query.search !== undefined ||
      query.limit !== undefined ||
      query.offset !== undefined
    );
  }

  private requirePrincipal(): { userId: UUID; orgId: UUID } {
    const { userId, orgId } = getRequiredUserContext(this.context);
    return { userId, orgId };
  }
}
