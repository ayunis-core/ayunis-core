import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { FindAllSkillsUseCase } from 'src/domain/skills/application/use-cases/find-all-skills/find-all-skills.use-case';
import { FindAllSkillsQuery } from 'src/domain/skills/application/use-cases/find-all-skills/find-all-skills.query';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import { WorkspacesRepository } from '../../ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from '../../workspaces.errors';
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
    private readonly findAllSkillsUseCase: FindAllSkillsUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: ListWorkspaceSkillCandidatesQuery,
  ): Promise<WorkspaceSkillCandidate[]> {
    this.logger.info(
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

    const [allSkills, refs] = await Promise.all([
      this.findAllSkillsUseCase.execute(new FindAllSkillsQuery()),
      this.workspacesRepository.getContextRefs(query.workspaceId),
    ]);
    const attachedIds = new Set(refs.skillIds);
    return allSkills.skills.map(({ skill }) => ({
      skill,
      isAttached: attachedIds.has(skill.id),
    }));
  }
}
