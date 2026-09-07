import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { WorkspaceKnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/workspace-knowledge-base-access.service';
@Injectable()
export class SetWorkspaceKnowledgeBaseActivationUseCase {
  private readonly logger = new Logger(
    SetWorkspaceKnowledgeBaseActivationUseCase.name,
  );
  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly access: WorkspaceKnowledgeBaseAccessService,
  ) {}
  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(command: {
    workspaceId: UUID;
    knowledgeBaseId: UUID;
    isActive: boolean;
  }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'set-workspace-knowledge-base-activation',
    );
    const knowledgeBase = await this.access.requireInWorkspace(
      command.workspaceId,
      command.knowledgeBaseId,
    );
    if (command.isActive)
      await this.repository.activateForWorkspace(
        command.knowledgeBaseId,
        command.workspaceId,
      );
    else
      await this.repository.deactivateForWorkspace(
        command.knowledgeBaseId,
        command.workspaceId,
      );
    return knowledgeBase;
  }
}
