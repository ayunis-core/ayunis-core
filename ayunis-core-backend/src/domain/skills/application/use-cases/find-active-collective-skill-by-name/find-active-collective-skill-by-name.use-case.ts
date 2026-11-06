import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { CollectiveSkillAccessService } from 'src/domain/skills/application/services/collective-skill-access.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import type { CollectiveSkill } from 'src/domain/skills/domain/skill';
import { FindActiveCollectiveSkillByNameQuery } from './find-active-collective-skill-by-name.query';

@Injectable()
export class FindActiveCollectiveSkillByNameUseCase {
  private readonly logger = new Logger(
    FindActiveCollectiveSkillByNameUseCase.name,
  );

  constructor(
    private readonly repository: SkillRepository,
    private readonly collectiveAccess: CollectiveSkillAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    query: FindActiveCollectiveSkillByNameQuery,
  ): Promise<CollectiveSkill> {
    this.logger.log(query, 'Finding active collective skill by name');
    const owners = await this.collectiveAccess.readableOwners();
    const skills = await this.repository.findActiveCollective(
      owners,
      query.name,
    );
    const skill = skills.find(
      (candidate) =>
        candidate instanceof TeamSkill === (query.ownerType === 'team'),
    );
    if (!skill) throw new SkillNotFoundError(query.name);
    return skill;
  }
}
