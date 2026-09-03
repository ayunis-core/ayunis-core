import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ListAccessibleSkillsUseCase } from 'src/domain/skills/application/use-cases/list-accessible-skills/list-accessible-skills.use-case';
import { ListAccessibleSkillsQuery } from 'src/domain/skills/application/use-cases/list-accessible-skills/list-accessible-skills.query';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { ListWorkspaceSkillCandidatesQuery } from './list-workspace-skill-candidates.query';

export interface WorkspaceSkillCandidate {
  skill: Skill;
  isAttached: boolean;
}

@Injectable()
export class ListWorkspaceSkillCandidatesUseCase {
  private readonly logger = new Logger(
    ListWorkspaceSkillCandidatesUseCase.name,
  );

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly listAccessibleSkillsUseCase: ListAccessibleSkillsUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: ListWorkspaceSkillCandidatesQuery,
  ): Promise<Paginated<WorkspaceSkillCandidate>> {
    this.logger.log(
      {
        workspaceId: query.workspaceId,
      },
      'listWorkspaceSkillCandidates',
    );
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    const workspace = await this.workspacesRepository.findById(
      userId,
      query.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(query.workspaceId);

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
