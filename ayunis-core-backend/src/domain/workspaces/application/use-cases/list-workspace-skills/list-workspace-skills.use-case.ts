import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { ListAccessibleSkillsUseCase } from 'src/domain/skills/application/use-cases/list-accessible-skills/list-accessible-skills.use-case';
import { ListAccessibleSkillsQuery } from 'src/domain/skills/application/use-cases/list-accessible-skills/list-accessible-skills.query';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { ListWorkspaceSkillsQuery } from './list-workspace-skills.query';

@Injectable()
export class ListWorkspaceSkillsUseCase {
  private readonly logger = new Logger(ListWorkspaceSkillsUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly listAccessibleSkillsUseCase: ListAccessibleSkillsUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(query: ListWorkspaceSkillsQuery): Promise<Paginated<Skill>> {
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    this.logger.log({ workspaceId: query.workspaceId }, 'listWorkspaceSkills');
    const workspace = await this.workspacesRepository.findById(
      userId,
      query.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(query.workspaceId);

    return this.listAccessibleSkillsUseCase.execute(
      new ListAccessibleSkillsQuery({
        workspaceId: query.workspaceId,
        search: query.search,
        limit: query.limit,
        offset: query.offset,
      }),
    );
  }
}
