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
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class FindSkillByNameUseCase {
  private readonly logger = new Logger(FindSkillByNameUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(query: FindSkillByNameQuery): Promise<PersonalSkill> {
    this.logger.log({ name: query.name }, 'Finding skill by name');

    const { userId } = getRequiredUserContext(this.contextService);

    const skill = await this.skillRepository.findByNameAndOwner(
      query.name,
      userId,
    );
    if (!skill) throw new SkillNotFoundError(query.name);
    return skill;
  }
}
