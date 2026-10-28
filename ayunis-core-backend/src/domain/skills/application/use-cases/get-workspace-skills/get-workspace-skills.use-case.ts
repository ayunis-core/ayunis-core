import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
@Injectable()
export class GetWorkspaceSkillsUseCase {
  private readonly logger = new Logger(GetWorkspaceSkillsUseCase.name);
  constructor(private readonly repository: SkillRepository) {}
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: { workspaceId: UUID; ids: UUID[] }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'get-workspace-skills',
    );
    const [skills, states] = await Promise.all([
      this.repository.findByIds(command.ids, command.workspaceId),
      this.repository.getWorkspaceSkillStates(command.ids, command.workspaceId),
    ]);
    return skills.map((skill) => ({
      skill,
      ...(states.get(skill.id) ?? { isActive: false, isPinned: false }),
    }));
  }
}
