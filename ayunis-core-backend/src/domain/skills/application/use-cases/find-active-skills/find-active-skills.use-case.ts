import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { Skill } from 'src/domain/skills/domain/skill';
import { CollectiveSkillAccessService } from 'src/domain/skills/application/services/collective-skill-access.service';
import { Injectable, Logger } from '@nestjs/common';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { FindActiveSkillsQuery } from './find-active-skills.query';

import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class FindActiveSkillsUseCase {
  private readonly logger = new Logger(FindActiveSkillsUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
    private readonly collectiveAccess: CollectiveSkillAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(query: FindActiveSkillsQuery): Promise<Skill[]> {
    this.logger.log(query, 'Finding active skills');

    const { userId } = getRequiredUserContext(this.contextService);
    const [personal, collective] = await Promise.all([
      this.skillRepository.findActiveByOwner(userId),
      this.collectiveAccess
        .readableOwners()
        .then((owners) => this.skillRepository.findActiveCollective(owners)),
    ]);
    return [...personal, ...collective];
  }
}
