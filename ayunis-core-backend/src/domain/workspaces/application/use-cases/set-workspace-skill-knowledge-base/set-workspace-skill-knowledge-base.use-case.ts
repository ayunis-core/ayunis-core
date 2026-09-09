import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { SetWorkspaceSkillKnowledgeBaseUseCase as MutateSkillUseCase } from 'src/domain/skills/application/use-cases/set-workspace-skill-knowledge-base/set-workspace-skill-knowledge-base.use-case';
import { FindWorkspaceSkillUseCase } from 'src/domain/skills/application/use-cases/find-workspace-skill/find-workspace-skill.use-case';
import { FindWorkspaceKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-workspace-knowledge-base/find-workspace-knowledge-base.use-case';
@Injectable()
export class SetWorkspaceSkillKnowledgeBaseUseCase {
  private readonly logger = new Logger(
    SetWorkspaceSkillKnowledgeBaseUseCase.name,
  );
  constructor(
    private readonly access: WorkspaceAccessService,
    private readonly mutate: MutateSkillUseCase,
    private readonly find: FindWorkspaceSkillUseCase,
    private readonly knowledgeBases: FindWorkspaceKnowledgeBaseUseCase,
  ) {}
  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
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
    await this.access.requireOwned(command.workspaceId);
    if (command.assigned) await this.knowledgeBases.execute(command);
    await this.mutate.execute(command);
    return this.find.execute(command);
  }
}
