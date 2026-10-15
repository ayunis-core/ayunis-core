import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { SkillContext } from 'src/domain/skills/application/models/skill-context';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { CollectiveSkill, Skill } from 'src/domain/skills/domain/skill';
import {
  CollectiveSkillRepository,
  type CollectiveSkillScope,
} from 'src/domain/skills/application/ports/collective-skill.repository';
import { SkillOwnershipContextService } from 'src/domain/skills/application/services/skill-ownership-context.service';
import { isCollectiveSkill } from 'src/domain/skills/application/models/collective-skill-owner';
import type { OwnershipViewer } from 'src/domain/ownership/application/models/ownership-viewer';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import type { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { SkillsConstants } from 'src/domain/skills/domain/skills.constants';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { ListAccessibleSkillsQuery } from './list-accessible-skills.query';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class ListAccessibleSkillsUseCase {
  private readonly logger = new Logger(ListAccessibleSkillsUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly collectiveRepository: CollectiveSkillRepository,
    private readonly ownershipContext: SkillOwnershipContextService,
    private readonly getViewer: GetOwnershipViewerUseCase,
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
    }));
  }

  private async listPersonal(
    query: ListAccessibleSkillsQuery,
    userId: UUID,
  ): Promise<Paginated<SkillContext>> {
    const viewer = await this.getViewer.execute();
    const scope = { userId, orgId: viewer.orgId, teamIds: viewer.teamIds };
    const page = this.hasPaging(query)
      ? await this.repository.findPaginatedAccessible(userId, undefined, {
          ...this.pagination(query),
          collective: scope,
        })
      : await this.unpaginatedPersonal(scope);
    return this.withPersonalContext(page, viewer);
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
    scope: CollectiveSkillScope,
  ): Promise<Paginated<PersonalSkill | CollectiveSkill>> {
    const [owned, collective] = await Promise.all([
      this.repository.findAllByOwner(scope.userId),
      this.collectiveRepository.findUsable(scope),
    ]);
    const data = this.sortByNameAndId([...owned, ...collective]);
    return new Paginated({
      data,
      limit: data.length,
      offset: 0,
      total: data.length,
    });
  }

  private async withPersonalContext(
    page: Paginated<PersonalSkill | CollectiveSkill>,
    viewer: OwnershipViewer,
  ): Promise<Paginated<SkillContext>> {
    const { userId } = viewer;
    const [activeIds, pinnedIds, ownership] = await Promise.all([
      this.repository.getActiveSkillIds(userId),
      this.repository.getPinnedSkillIds(userId),
      this.ownershipContext.lookup(page.data, viewer),
    ]);
    return this.mapPage(page, (skill) => {
      const extras = {
        viewer: ownership.rightsFor(skill),
        ownerDescription: ownership.describe(skill),
      };
      if (isCollectiveSkill(skill)) {
        return {
          skill,
          ...ownership.stateOf(skill),
          ...extras,
        };
      }
      return {
        skill,
        isActive: activeIds.has(skill.id),
        isPinned: pinnedIds.has(skill.id),
        ...extras,
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
    const { userId } = getRequiredUserContext(this.context);
    return userId;
  }
}
