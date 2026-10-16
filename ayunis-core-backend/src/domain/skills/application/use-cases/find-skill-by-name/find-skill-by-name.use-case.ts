import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { Injectable, Logger } from '@nestjs/common';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { FindSkillByNameQuery } from './find-skill-by-name.query';

import { ContextService } from 'src/common/context/services/context.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import { FindSharesByScopeQuery } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { SkillShare } from 'src/domain/shares/domain/share.entity';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { CollectiveSkillRepository } from 'src/domain/skills/application/ports/collective-skill.repository';
import type { CollectiveSkill } from 'src/domain/skills/domain/skill';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { skillSlugName } from 'src/domain/skills/domain/skill-slug-prefix';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';

@Injectable()
export class FindSkillByNameUseCase {
  private readonly logger = new Logger(FindSkillByNameUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly findSharesByScopeUseCase: FindSharesByScopeUseCase,
    private readonly contextService: ContextService,
    private readonly collectiveRepository: CollectiveSkillRepository,
    private readonly getViewer: GetOwnershipViewerUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    query: FindSkillByNameQuery,
  ): Promise<PersonalSkill | CollectiveSkill> {
    this.logger.log(
      { name: query.name, scope: query.scope },
      'Finding skill by name',
    );
    return query.scope === 'personal'
      ? this.findPersonal(query.name)
      : this.findCollective(query.name, query.scope);
  }

  private async findCollective(
    name: string,
    scope: 'team' | 'org',
  ): Promise<CollectiveSkill> {
    const viewer = await this.getViewer.execute();
    const usable = await this.collectiveRepository.findUsable({
      userId: viewer.userId,
      orgId: viewer.orgId,
      teamIds: viewer.teamIds,
    });
    const match = usable.find(
      (skill) =>
        skillSlugName(skill) === name &&
        (scope === 'team'
          ? skill instanceof TeamSkill
          : skill instanceof OrgSkill),
    );
    if (!match) throw new SkillNotFoundError(name);
    return match;
  }

  private async findPersonal(name: string): Promise<PersonalSkill> {
    const { userId } = getRequiredUserContext(this.contextService);

    // Owned skills take priority
    const ownedSkill = await this.skillRepository.findByNameAndOwner(
      name,
      userId,
    );

    if (ownedSkill) {
      return ownedSkill;
    }

    // Check shared skills
    const shares = await this.findSharesByScopeUseCase.execute(
      new FindSharesByScopeQuery(SharedEntityType.SKILL),
    );

    if (shares.length > 0) {
      const sharedSkillIds = shares.map((s) => (s as SkillShare).skillId);
      const sharedSkills = await this.skillRepository.findByIds(
        sharedSkillIds,
        null,
      );
      const matchingSkill = sharedSkills.find((s) => s.name === name);

      if (matchingSkill) {
        return matchingSkill;
      }
    }

    throw new SkillNotFoundError(name);
  }
}
