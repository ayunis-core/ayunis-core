import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { FindSkillByNameQuery } from './find-skill-by-name.query';

import { ContextService } from 'src/common/context/services/context.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { CollectiveSkillRepository } from 'src/domain/skills/application/ports/collective-skill.repository';
import { WorkspaceSkillLinkRepository } from 'src/domain/skills/application/ports/workspace-skill-link.repository';
import type { CollectiveSkill, Skill } from 'src/domain/skills/domain/skill';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { skillSlugName } from 'src/domain/skills/domain/skill-slug-prefix';
import type { SkillNameScope } from './find-skill-by-name.query';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';

type NamedSkill = PersonalSkill | CollectiveSkill;

function inScope(skill: Skill, scope: SkillNameScope): skill is NamedSkill {
  if (scope === 'team') return skill instanceof TeamSkill;
  if (scope === 'org') return skill instanceof OrgSkill;
  return skill instanceof PersonalSkill;
}

@Injectable()
export class FindSkillByNameUseCase {
  private readonly logger = new Logger(FindSkillByNameUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
    private readonly collectiveRepository: CollectiveSkillRepository,
    private readonly getViewer: GetOwnershipViewerUseCase,
    private readonly links: WorkspaceSkillLinkRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(query: FindSkillByNameQuery): Promise<NamedSkill> {
    this.logger.log(
      { name: query.name, scope: query.scope },
      'Finding skill by name',
    );
    const own =
      query.scope === 'personal'
        ? await this.findPersonal(query.name)
        : await this.findCollective(query.name, query.scope);
    const match =
      own ??
      (query.workspaceId
        ? await this.findLinked(query.workspaceId, query.name, query.scope)
        : null);
    if (!match) throw new SkillNotFoundError(query.name);
    return match;
  }

  private async findCollective(
    name: string,
    scope: 'team' | 'org',
  ): Promise<CollectiveSkill | null> {
    const viewer = await this.getViewer.execute();
    const usable = await this.collectiveRepository.findUsable({
      userId: viewer.userId,
      orgId: viewer.orgId,
      teamIds: viewer.teamIds,
    });
    return (
      usable.find(
        (skill): skill is CollectiveSkill =>
          skillSlugName(skill) === name && inScope(skill, scope),
      ) ?? null
    );
  }

  private findPersonal(name: string): Promise<PersonalSkill | null> {
    const { userId } = getRequiredUserContext(this.contextService);
    return this.skillRepository.findByNameAndOwner(name, userId);
  }

  private async findLinked(
    workspaceId: UUID,
    name: string,
    scope: SkillNameScope,
  ): Promise<NamedSkill | null> {
    const { userId } = getRequiredUserContext(this.contextService);
    const links = await this.links.findByWorkspace(workspaceId);
    if (links.length === 0) return null;
    const skills = await this.skillRepository.findByIds(
      links.map(({ skillId }) => skillId),
    );
    return (
      skills.find(
        (skill): skill is NamedSkill =>
          inScope(skill, scope) && skillSlugName(skill, userId) === name,
      ) ?? null
    );
  }
}
