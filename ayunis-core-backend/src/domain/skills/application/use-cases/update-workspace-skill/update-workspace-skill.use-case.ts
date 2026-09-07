import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { WorkspaceSkillAccessService } from 'src/domain/skills/application/services/workspace-skill-access.service';
import type { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { InvalidSkillNameError } from 'src/domain/skills/domain/abstract-skill.entity';
import {
  DuplicateSkillNameError,
  SkillInvalidInputError,
} from 'src/domain/skills/application/skills.errors';
@Injectable()
export class UpdateWorkspaceSkillUseCase {
  private readonly logger = new Logger(UpdateWorkspaceSkillUseCase.name);
  constructor(
    private readonly repository: SkillRepository,
    private readonly access: WorkspaceSkillAccessService,
  ) {}
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: {
    workspaceId: UUID;
    skillId: UUID;
    values: Pick<WorkspaceSkill, 'name' | 'shortDescription' | 'instructions'>;
  }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'update-workspace-skill',
    );
    const skill = await this.access.requireInWorkspace(
      command.workspaceId,
      command.skillId,
    );
    if (command.values.name !== skill.name) {
      const duplicate = await this.repository.findByNameAndWorkspace(
        command.values.name,
        command.workspaceId,
      );
      if (duplicate && duplicate.id !== skill.id)
        throw new DuplicateSkillNameError(command.values.name);
    }
    try {
      return await this.repository.update(
        skill.withUpdates({ ...command.values, updatedAt: new Date() }),
        skill,
      );
    } catch (error) {
      if (error instanceof InvalidSkillNameError)
        throw new SkillInvalidInputError(error.message);
      throw error;
    }
  }
}
