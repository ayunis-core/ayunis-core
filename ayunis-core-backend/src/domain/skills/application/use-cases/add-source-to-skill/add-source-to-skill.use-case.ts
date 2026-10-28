import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillNotFoundError,
  SkillSourceAlreadyAssignedError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import type { Skill } from 'src/domain/skills/domain/skill';
import { assertSkillHasSourceCapacity } from 'src/domain/skills/application/util/skill-source-capacity';
import { AddSourceToSkillCommand } from './add-source-to-skill.command';

@Injectable()
export class AddSourceToSkillUseCase {
  private readonly logger = new Logger(AddSourceToSkillUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: AddSourceToSkillCommand): Promise<Skill> {
    this.logger.log(command, 'Adding source to skill');
    const skill = await this.repository.findById(command.skillId);
    if (!skill) throw new SkillNotFoundError(command.skillId);
    await this.authorization.requireWrite(skill);
    if (skill.sourceIds.includes(command.sourceId)) {
      throw new SkillSourceAlreadyAssignedError(command.sourceId);
    }
    assertSkillHasSourceCapacity(skill.sourceIds);
    return this.repository.update(
      skill.withUpdates({
        sourceIds: [...skill.sourceIds, command.sourceId],
      }),
      skill,
    );
  }
}
