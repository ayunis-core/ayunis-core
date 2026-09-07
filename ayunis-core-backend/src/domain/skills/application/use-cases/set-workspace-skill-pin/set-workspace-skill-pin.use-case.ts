import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { WorkspaceSkillAccessService } from 'src/domain/skills/application/services/workspace-skill-access.service';
import { SkillInvalidInputError } from 'src/domain/skills/application/skills.errors';
@Injectable()
export class SetWorkspaceSkillPinUseCase {
  private readonly logger = new Logger(SetWorkspaceSkillPinUseCase.name);
  constructor(
    private readonly repository: SkillRepository,
    private readonly access: WorkspaceSkillAccessService,
  ) {}
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: {
    workspaceId: UUID;
    skillId: UUID;
    isPinned: boolean;
  }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'set-workspace-skill-pin',
    );
    const skill = await this.access.requireInWorkspace(
      command.workspaceId,
      command.skillId,
    );
    const states = await this.repository.getWorkspaceSkillStates(
      [command.skillId],
      command.workspaceId,
    );
    if (command.isPinned && !states.get(command.skillId)?.isActive)
      throw new SkillInvalidInputError(
        'An inactive workspace skill cannot be pinned.',
      );
    await this.repository.setWorkspaceSkillPinned(
      command.skillId,
      command.workspaceId,
      command.isPinned,
    );
    return skill;
  }
}
