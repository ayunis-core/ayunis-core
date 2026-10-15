import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { Injectable, Logger } from '@nestjs/common';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { FindActiveSkillsQuery } from './find-active-skills.query';

import { CollectiveSkillRepository } from 'src/domain/skills/application/ports/collective-skill.repository';
import type { CollectiveSkill } from 'src/domain/skills/domain/skill';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';

@Injectable()
export class FindActiveSkillsUseCase {
  private readonly logger = new Logger(FindActiveSkillsUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly collectiveRepository: CollectiveSkillRepository,
    private readonly getViewer: GetOwnershipViewerUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    query: FindActiveSkillsQuery,
  ): Promise<Array<PersonalSkill | CollectiveSkill>> {
    this.logger.log(query, 'Finding active skills');
    const viewer = await this.getViewer.execute();
    const [personal, collective] = await Promise.all([
      this.skillRepository.findActiveByOwner(viewer.userId),
      this.collectiveRepository.findActiveUsable({
        userId: viewer.userId,
        orgId: viewer.orgId,
        teamIds: viewer.teamIds,
      }),
    ]);
    return [...personal, ...collective];
  }
}
