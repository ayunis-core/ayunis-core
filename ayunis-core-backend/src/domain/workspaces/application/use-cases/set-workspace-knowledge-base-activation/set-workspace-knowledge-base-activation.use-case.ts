import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { SetWorkspaceKnowledgeBaseActivationUseCase as MutateKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/set-workspace-knowledge-base-activation/set-workspace-knowledge-base-activation.use-case';
import { GetWorkspaceKnowledgeBaseUseCase } from 'src/domain/workspaces/application/use-cases/get-workspace-knowledge-base/get-workspace-knowledge-base.use-case';
@Injectable()
export class SetWorkspaceKnowledgeBaseActivationUseCase {
  private readonly logger = new Logger(
    SetWorkspaceKnowledgeBaseActivationUseCase.name,
  );
  constructor(
    private readonly access: WorkspaceAccessService,
    private readonly mutate: MutateKnowledgeBaseUseCase,
    private readonly getContext: GetWorkspaceKnowledgeBaseUseCase,
  ) {}
  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: {
    workspaceId: UUID;
    knowledgeBaseId: UUID;
    isActive: boolean;
  }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'set-workspace-knowledge-base-activation',
    );
    await this.access.requireOwned(command.workspaceId);
    await this.mutate.execute(command);
    return this.getContext.execute(command);
  }
}
