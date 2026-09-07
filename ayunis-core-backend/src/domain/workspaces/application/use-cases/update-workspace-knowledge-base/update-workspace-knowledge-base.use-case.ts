import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UpdateWorkspaceKnowledgeBaseUseCase as MutateKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/update-workspace-knowledge-base/update-workspace-knowledge-base.use-case';
import { GetWorkspaceKnowledgeBaseUseCase } from 'src/domain/workspaces/application/use-cases/get-workspace-knowledge-base/get-workspace-knowledge-base.use-case';
import type { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
@Injectable()
export class UpdateWorkspaceKnowledgeBaseUseCase {
  private readonly logger = new Logger(
    UpdateWorkspaceKnowledgeBaseUseCase.name,
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
    values: Pick<WorkspaceKnowledgeBase, 'name' | 'description'>;
  }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'update-workspace-knowledge-base',
    );
    await this.access.requireOwned(command.workspaceId);
    await this.mutate.execute(command);
    return this.getContext.execute(command);
  }
}
