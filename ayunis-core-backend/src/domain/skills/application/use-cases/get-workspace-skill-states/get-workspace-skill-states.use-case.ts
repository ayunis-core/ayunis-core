import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
@Injectable()
export class GetWorkspaceSkillStatesUseCase {
  private readonly logger = new Logger(GetWorkspaceSkillStatesUseCase.name);
  constructor(private readonly repository: SkillRepository) {}
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: { workspaceId: UUID; ids: UUID[] }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'get-workspace-skill-states',
    );
    return this.repository.getWorkspaceSkillStates(
      command.ids,
      command.workspaceId,
    );
  }
}
