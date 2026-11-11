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
import type { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { ListKnowledgeBasesQuery } from './list-knowledge-bases.query';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { AbstractCollectiveKnowledgeBase } from 'src/domain/knowledge-bases/domain/collective-knowledge-base.entity';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { CollectiveKnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/collective-knowledge-base-access.service';

const DEFAULT_OFFSET = 0;

@Injectable()
export class ListKnowledgeBasesUseCase {
  private readonly logger = new Logger(ListKnowledgeBasesUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly context: ContextService,
    @Inject(forwardRef(() => AssertWorkspaceReadAccessUseCase))
    private readonly workspaceRead: AssertWorkspaceReadAccessUseCase,
    private readonly collectiveAccess: CollectiveKnowledgeBaseAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    query: ListKnowledgeBasesQuery,
  ): Promise<Paginated<KnowledgeBaseContext>> {
    const { userId } = getRequiredUserContext(this.context);
    this.logger.log({ ownerType: query.owner.type }, 'Listing knowledge bases');
    const page = await this.findPage(query, userId);
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
    return this.hasExplicitPaging(query)
      ? this.findPersonalPaginated(userId, this.paginationOptions(query))
      : this.findAllPersonal(userId);
  }

  private async findAllPersonal(
    userId: UUID,
  ): Promise<Paginated<KnowledgeBaseWithUserContext>> {
    const [owned, activeIds, collective] = await Promise.all([
      this.repository.findAllByUserId(userId),
      this.repository.getActiveIds(userId),
      this.collectiveAccess
        .readableOwners()
        .then((owners) => this.repository.findAllCollective(owners)),
    ]);
    return this.unpaginated([
      ...owned.map((knowledgeBase) => ({
        knowledgeBase,
        isActive: activeIds.has(knowledgeBase.id),
      })),
      ...collective.map((knowledgeBase) => ({
        knowledgeBase,
        isActive: knowledgeBase.isActive,
      })),
    ]);
  }

  private async findPersonalPaginated(
    userId: UUID,
    options: KnowledgeBaseListOptions,
  ): Promise<Paginated<KnowledgeBaseWithUserContext>> {
    const [activeIds, owners] = await Promise.all([
      this.repository.getActiveIds(userId),
      this.collectiveAccess.readableOwners(),
    ]);
    const page = await this.repository.findPaginatedAccessible(
      userId,
      undefined,
      options,
      owners,
    );
    return this.mapPage(page, (knowledgeBase) => ({
      knowledgeBase,
      isActive:
        knowledgeBase instanceof AbstractCollectiveKnowledgeBase
          ? knowledgeBase.isActive
          : activeIds.has(knowledgeBase.id),
    }));
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
      options,
    );
    const states = await this.repository.getWorkspaceStates(
      page.data.map(({ id }) => id),
      workspaceId,
    );
    return this.mapPage(page, (knowledgeBase) => ({
      knowledgeBase,
      isActive: states.get(knowledgeBase.id)?.isActive ?? false,
    }));
  }

  private unpaginated<T extends KnowledgeBaseWithUserContext>(
    data: T[],
  ): Paginated<T> {
    data.sort((left, right) => this.compareByNameAndId(left, right));
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
    left: KnowledgeBaseWithUserContext,
    right: KnowledgeBaseWithUserContext,
  ): number {
    const byName = left.knowledgeBase.name.localeCompare(
      right.knowledgeBase.name,
      undefined,
      { sensitivity: 'base' },
    );
    return (
      byName || left.knowledgeBase.id.localeCompare(right.knowledgeBase.id)
    );
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
}
