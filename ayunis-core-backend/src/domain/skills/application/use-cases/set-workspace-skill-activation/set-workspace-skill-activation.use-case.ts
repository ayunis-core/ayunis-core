import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { WorkspaceSkillAccessService } from 'src/domain/skills/application/services/workspace-skill-access.service';
@Injectable()
export class SetWorkspaceSkillActivationUseCase {
  private readonly logger = new Logger(SetWorkspaceSkillActivationUseCase.name);
  constructor(
    private readonly repository: SkillRepository,
    private readonly access: WorkspaceSkillAccessService,
  ) {}
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: {
    workspaceId: UUID;
    skillId: UUID;
    isActive: boolean;
  }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'set-workspace-skill-activation',
    );
    const skill = await this.access.requireInWorkspace(
      command.workspaceId,
      command.skillId,
    );
    if (command.isActive)
      await this.repository.activateWorkspaceSkill(
        command.skillId,
        command.workspaceId,
      );
    else
      await this.repository.deactivateWorkspaceSkill(
        command.skillId,
        command.workspaceId,
      );
    return skill;
  }
}
