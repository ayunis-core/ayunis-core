import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { WorkspaceSkillAccessService } from 'src/domain/skills/application/services/workspace-skill-access.service';
@Injectable()
export class FindWorkspaceSkillUseCase {
  private readonly logger = new Logger(FindWorkspaceSkillUseCase.name);
  constructor(
    private readonly repository: SkillRepository,
    private readonly access: WorkspaceSkillAccessService,
  ) {}
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: { workspaceId: UUID; skillId: UUID }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'find-workspace-skill',
    );
    const skill = await this.access.requireInWorkspace(
      command.workspaceId,
      command.skillId,
    );
    const states = await this.repository.getWorkspaceSkillStates(
      [command.skillId],
      command.workspaceId,
    );
    return {
      skill,
      ...(states.get(skill.id) ?? { isActive: false, isPinned: false }),
    };
  }
}
