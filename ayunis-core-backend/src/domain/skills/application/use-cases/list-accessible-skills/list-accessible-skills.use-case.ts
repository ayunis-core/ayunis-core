import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { SkillContext } from 'src/domain/skills/application/models/skill-context';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillCreatorNameService } from 'src/domain/skills/application/services/skill-creator-name.service';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import type { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { SkillsConstants } from 'src/domain/skills/domain/skills.constants';
import { FindSharesByScopeQuery } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.query';
import { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { ListAccessibleSkillsQuery } from './list-accessible-skills.query';

@Injectable()
export class ListAccessibleSkillsUseCase {
  private readonly logger = new Logger(ListAccessibleSkillsUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly findShares: FindSharesByScopeUseCase,
    private readonly creatorNames: SkillCreatorNameService,
    private readonly context: ContextService,
    @Inject(forwardRef(() => AssertWorkspaceReadAccessUseCase))
    private readonly workspaceRead: AssertWorkspaceReadAccessUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    query: ListAccessibleSkillsQuery,
  ): Promise<Paginated<SkillContext>> {
    const userId = this.requireUserId();
    this.logger.log({ ownerType: query.owner.type }, 'Listing skills');
    return query.owner.type === 'workspace'
      ? this.listWorkspace(query, userId)
      : this.listPersonal(query, userId);
  }

  private async listWorkspace(
    query: ListAccessibleSkillsQuery,
    userId: UUID,
  ): Promise<Paginated<SkillContext>> {
    const workspaceId =
      query.owner.type === 'workspace' ? query.owner.workspaceId : undefined;
    if (!workspaceId) throw new UnauthorizedAccessError();
    await this.workspaceRead.execute({ workspaceId });
    const page = this.hasPaging(query)
      ? await this.repository.findPaginatedAccessible(
          userId,
          workspaceId,
          [],
          this.pagination(query),
        )
      : await this.unpaginatedWorkspace(workspaceId);
    const states = await this.repository.getWorkspaceSkillStates(
      page.data.map(({ id }) => id),
      workspaceId,
    );
    return this.mapPage(page, (skill) => ({
      skill,
      ...(states.get(skill.id) ?? { isActive: false, isPinned: false }),
      isShared: false,
      creatorName: null,
    }));
  }

  private async listPersonal(
    query: ListAccessibleSkillsQuery,
    userId: UUID,
  ): Promise<Paginated<SkillContext>> {
    const shares = await this.findShares.execute(
      new FindSharesByScopeQuery(SharedEntityType.SKILL),
    );
    const sharedIds = shares.map(({ entityId }) => entityId);
    const page = this.hasPaging(query)
      ? await this.repository.findPaginatedAccessible(
          userId,
          undefined,
          sharedIds,
          this.pagination(query),
        )
      : await this.unpaginatedPersonal(userId, sharedIds);
    return this.withPersonalContext(page, userId);
  }

  private async unpaginatedWorkspace(
    workspaceId: UUID,
  ): Promise<Paginated<WorkspaceSkill>> {
    const data = this.sortByNameAndId(
      await this.repository.findAllByWorkspaceId(workspaceId),
    );
    return new Paginated({
      data,
      limit: data.length,
      offset: 0,
      total: data.length,
    });
  }

  private async unpaginatedPersonal(
    userId: UUID,
    sharedIds: UUID[],
  ): Promise<Paginated<PersonalSkill>> {
    const owned = await this.repository.findAllByOwner(userId);
    const ownedIds = new Set(owned.map(({ id }) => id));
    const ids = [...new Set(sharedIds)].filter((id) => !ownedIds.has(id));
    const shared = ids.length ? await this.repository.findByIds(ids, null) : [];
    const data = this.sortByNameAndId([...owned, ...shared]);
    return new Paginated({
      data,
      limit: data.length,
      offset: 0,
      total: data.length,
    });
  }

  private async withPersonalContext(
    page: Paginated<PersonalSkill>,
    userId: UUID,
  ): Promise<Paginated<SkillContext>> {
    const sharedCreatorIds = page.data
      .filter(({ userId: ownerId }) => ownerId !== userId)
      .map(({ userId: ownerId }) => ownerId);
    const [activeIds, pinnedIds, names] = await Promise.all([
      this.repository.getActiveSkillIds(userId),
      this.repository.getPinnedSkillIds(userId),
      this.creatorNames.resolveMany(sharedCreatorIds),
    ]);
    return this.mapPage(page, (skill) => {
      const isShared = skill.userId !== userId;
      return {
        skill,
        isActive: activeIds.has(skill.id),
        isPinned: pinnedIds.has(skill.id),
        isShared,
        creatorName: isShared ? (names.get(skill.userId) ?? null) : null,
      };
    });
  }

  private pagination(query: ListAccessibleSkillsQuery) {
    return {
      search: query.search,
      limit: query.limit ?? SkillsConstants.DEFAULT_LIST_LIMIT,
      offset: query.offset ?? 0,
    };
  }

  private hasPaging(query: ListAccessibleSkillsQuery): boolean {
    return (
      query.search !== undefined ||
      query.limit !== undefined ||
      query.offset !== undefined
    );
  }

  private sortByNameAndId<T extends Skill>(skills: T[]): T[] {
    return skills.sort((left, right) => {
      const byName = left.name.localeCompare(right.name, undefined, {
        sensitivity: 'base',
      });
      return byName || left.id.localeCompare(right.id);
    });
  }

  private mapPage<T extends Skill>(
    page: Paginated<T>,
    map: (skill: T) => SkillContext,
  ): Paginated<SkillContext> {
    return new Paginated({
      data: page.data.map(map),
      limit: page.limit,
      offset: page.offset,
      total: page.total,
    });
  }

  private requireUserId(): UUID {
    const userId = this.context.get('userId');
    if (!userId) throw new UnauthorizedAccessError();
    return userId;
  }
}
