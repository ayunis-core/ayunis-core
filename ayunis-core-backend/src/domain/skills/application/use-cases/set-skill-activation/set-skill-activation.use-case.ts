import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { AbstractCollectiveSkill } from 'src/domain/skills/domain/collective-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import type { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { getRequiredUserContext } from 'src/common/context/required-context';

interface SetSkillActivationCommand {
  skillId: UUID;
  isActive: boolean;
}

@Injectable()
export class SetSkillActivationUseCase {
  private readonly logger = new Logger(SetSkillActivationUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  @Transactional()
  async execute(command: SetSkillActivationCommand): Promise<Skill> {
    this.logger.log(command, 'Setting skill activation');
    const skill = await this.repository.findById(command.skillId);
    if (!skill) throw new SkillNotFoundError(command.skillId);
    if (skill instanceof AbstractCollectiveSkill) {
      await this.authorization.requireWrite(skill);
      return this.repository.update(
        skill.withState({ isActive: command.isActive }),
        skill,
      );
    }
    if (skill instanceof PersonalSkill) {
      await this.setPersonal(skill, command.isActive);
    } else {
      await this.setWorkspace(skill, command.isActive);
    }
    return skill;
  }

  private async setPersonal(
    skill: PersonalSkill,
    isActive: boolean,
  ): Promise<void> {
    await this.authorization.requireRead(skill);
    const userId = this.requireUserId();
    if (isActive) await this.repository.activateSkill(skill.id, userId);
    else await this.repository.deactivateSkill(skill.id, userId);
  }

  private async setWorkspace(
    skill: WorkspaceSkill,
    isActive: boolean,
  ): Promise<void> {
    await this.authorization.requireWrite(skill);
    if (isActive) {
      await this.repository.activateWorkspaceSkill(skill.id, skill.workspaceId);
    } else {
      await this.repository.deactivateWorkspaceSkill(
        skill.id,
        skill.workspaceId,
      );
    }
  }

  private requireUserId(): UUID {
    const { userId } = getRequiredUserContext(this.context);
    return userId;
  }
}
