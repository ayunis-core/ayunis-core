import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { WorkspaceSkillAccessService } from 'src/domain/skills/application/services/workspace-skill-access.service';
@Injectable()
export class SetWorkspaceSkillKnowledgeBaseUseCase {
  private readonly logger = new Logger(
    SetWorkspaceSkillKnowledgeBaseUseCase.name,
  );
  constructor(
    private readonly repository: SkillRepository,
    private readonly access: WorkspaceSkillAccessService,
  ) {}
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: {
    workspaceId: UUID;
    skillId: UUID;
    knowledgeBaseId: UUID;
    assigned: boolean;
  }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'set-workspace-skill-knowledge-base',
    );
    const skill = await this.access.requireInWorkspace(
      command.workspaceId,
      command.skillId,
    );
    const ids = new Set(skill.knowledgeBaseIds);
    if (command.assigned) ids.add(command.knowledgeBaseId);
    else ids.delete(command.knowledgeBaseId);
    return this.repository.update(
      skill.withUpdates({ knowledgeBaseIds: [...ids], updatedAt: new Date() }),
      skill,
    );
  }
}
