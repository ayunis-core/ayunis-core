import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { Injectable, Logger } from '@nestjs/common';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { FindSkillByNameQuery } from './find-skill-by-name.query';

import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import { FindSharesByScopeQuery } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { SkillShare } from 'src/domain/shares/domain/share.entity';

@Injectable()
export class FindSkillByNameUseCase {
  private readonly logger = new Logger(FindSkillByNameUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly findSharesByScopeUseCase: FindSharesByScopeUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(query: FindSkillByNameQuery): Promise<PersonalSkill> {
    this.logger.log({ name: query.name }, 'Finding skill by name');

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    // Owned skills take priority
    const ownedSkill = await this.skillRepository.findByNameAndOwner(
      query.name,
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
      const matchingSkill = sharedSkills.find((s) => s.name === query.name);

      if (matchingSkill) {
        return matchingSkill;
      }
    }

    throw new SkillNotFoundError(query.name);
  }
}
