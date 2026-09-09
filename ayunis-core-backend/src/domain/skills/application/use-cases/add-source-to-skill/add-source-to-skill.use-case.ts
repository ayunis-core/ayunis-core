import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { AddSourceToSkillCommand } from './add-source-to-skill.command';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  SkillNotFoundError,
  SkillSourceAlreadyAssignedError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';

import { assertSkillHasSourceCapacity } from 'src/domain/skills/application/util/skill-source-capacity';

@Injectable()
export class AddSourceToSkillUseCase {
  private readonly logger = new Logger(AddSourceToSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: AddSourceToSkillCommand): Promise<PersonalSkill> {
    this.logger.log(
      {
        skillId: command.skillId,
        sourceId: command.sourceId,
      },
      'Adding source to skill',
    );
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();
    const skill = await this.skillRepository.findOne(command.skillId, userId);
    if (!skill) throw new SkillNotFoundError(command.skillId);
    const updated = await this.addSource(skill, command.sourceId);
    if (!(updated instanceof PersonalSkill))
      throw new SkillNotFoundError(skill.id);
    return updated;
  }

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async executeForAuthorizedSkill(
    authorizedSkill: Skill,
    sourceId: UUID,
  ): Promise<Skill> {
    const skill = await this.reloadAuthorizedSkill(authorizedSkill);
    return this.addSource(skill, sourceId);
  }

  private async reloadAuthorizedSkill(authorizedSkill: Skill): Promise<Skill> {
    const skill = (
      await this.skillRepository.findByIds([authorizedSkill.id])
    ).find(
      (candidate) =>
        (candidate instanceof PersonalSkill &&
          authorizedSkill instanceof PersonalSkill &&
          candidate.userId === authorizedSkill.userId) ||
        (candidate instanceof WorkspaceSkill &&
          authorizedSkill instanceof WorkspaceSkill &&
          candidate.workspaceId === authorizedSkill.workspaceId),
    );
    if (!skill) throw new SkillNotFoundError(authorizedSkill.id);
    return skill;
  }

  private async addSource(skill: Skill, sourceId: UUID): Promise<Skill> {
    if (skill.sourceIds.includes(sourceId)) {
      throw new SkillSourceAlreadyAssignedError(sourceId);
    }
    assertSkillHasSourceCapacity(skill.sourceIds);
    return this.skillRepository.update(
      skill.withUpdates({
        ...skill,
        sourceIds: [...skill.sourceIds, sourceId],
      }),
      skill,
    );
  }
}
