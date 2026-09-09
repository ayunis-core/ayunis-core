import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { ListAccessibleSkillsUseCase } from 'src/domain/skills/application/use-cases/list-accessible-skills/list-accessible-skills.use-case';
import { ListAccessibleSkillsQuery } from 'src/domain/skills/application/use-cases/list-accessible-skills/list-accessible-skills.query';
import { GetWorkspaceSkillStatesUseCase } from 'src/domain/skills/application/use-cases/get-workspace-skill-states/get-workspace-skill-states.use-case';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { ListWorkspaceSkillsQuery } from './list-workspace-skills.query';
import type { WorkspaceSkillContext } from 'src/domain/workspaces/domain/workspace-run-context.entity';

@Injectable()
export class ListWorkspaceSkillsUseCase {
  private readonly logger = new Logger(ListWorkspaceSkillsUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly listAccessibleSkillsUseCase: ListAccessibleSkillsUseCase,
    private readonly getWorkspaceSkillStates: GetWorkspaceSkillStatesUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: ListWorkspaceSkillsQuery,
  ): Promise<Paginated<WorkspaceSkillContext>> {
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    this.logger.log({ workspaceId: query.workspaceId }, 'listWorkspaceSkills');
    const workspace = await this.workspacesRepository.findById(
      userId,
      query.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(query.workspaceId);

    const page = await this.listAccessibleSkillsUseCase.execute(
      new ListAccessibleSkillsQuery({
        workspaceId: query.workspaceId,
        search: query.search,
        limit: query.limit,
        offset: query.offset,
      }),
    );
    const states = await this.getWorkspaceSkillStates.execute({
      workspaceId: query.workspaceId,
      ids: page.data.map((skill) => skill.id),
    });
    return new Paginated({
      data: page.data.map((skill) => {
        if (!(skill instanceof WorkspaceSkill))
          throw new Error('Workspace query returned a personal skill');
        return {
          skill,
          ...(states.get(skill.id) ?? { isActive: false, isPinned: false }),
        };
      }),
      limit: page.limit,
      offset: page.offset,
      total: page.total,
    });
  }
}
