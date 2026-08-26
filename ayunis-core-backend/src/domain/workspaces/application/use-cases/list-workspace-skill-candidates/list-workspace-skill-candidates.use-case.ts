import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { ListAccessibleSkillsQuery } from 'src/domain/skills/application/use-cases/list-accessible-skills/list-accessible-skills.query';
import { ListAccessibleSkillsUseCase } from 'src/domain/skills/application/use-cases/list-accessible-skills/list-accessible-skills.use-case';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { ListWorkspaceSkillCandidatesQuery } from './list-workspace-skill-candidates.query';

export interface WorkspaceSkillCandidate {
  skill: Skill;
  isAttached: boolean;
}

@Injectable()
export class ListWorkspaceSkillCandidatesUseCase {
  constructor(
    @InjectPinoLogger(ListWorkspaceSkillCandidatesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly listAccessibleSkillsUseCase: ListAccessibleSkillsUseCase,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: ListWorkspaceSkillCandidatesQuery,
  ): Promise<Paginated<WorkspaceSkillCandidate>> {
    this.logger.info(
      { workspaceId: query.workspaceId },
      'listWorkspaceSkillCandidates',
    );
    await this.accessService.requireAccessLevel(
      query.workspaceId,
      WorkspaceAccessLevel.EDIT,
    );
    const [skills, refs] = await Promise.all([
      this.listAccessibleSkillsUseCase.execute(
        new ListAccessibleSkillsQuery({
          search: query.search,
          limit: query.limit,
          offset: query.offset,
        }),
      ),
      this.workspacesRepository.getContextRefs(query.workspaceId),
    ]);
    const attachedIds = new Set(refs.skillIds);
    return new Paginated({
      data: skills.data.map((skill) => ({
        skill,
        isAttached: attachedIds.has(skill.id),
      })),
      limit: skills.limit,
      offset: skills.offset,
      total: skills.total,
    });
  }
}
