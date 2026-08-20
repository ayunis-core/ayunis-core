import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { ListAccessibleSkillsQuery } from 'src/domain/skills/application/use-cases/list-accessible-skills/list-accessible-skills.query';
import { ListAccessibleSkillsUseCase } from 'src/domain/skills/application/use-cases/list-accessible-skills/list-accessible-skills.use-case';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { ListWorkspaceSkillsQuery } from './list-workspace-skills.query';

@Injectable()
export class ListWorkspaceSkillsUseCase {
  constructor(
    @InjectPinoLogger(ListWorkspaceSkillsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly listAccessibleSkillsUseCase: ListAccessibleSkillsUseCase,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(query: ListWorkspaceSkillsQuery): Promise<Paginated<Skill>> {
    this.logger.info({ workspaceId: query.workspaceId }, 'listWorkspaceSkills');
    await this.accessService.requireRole(query.workspaceId, WorkspaceRole.USE);
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
