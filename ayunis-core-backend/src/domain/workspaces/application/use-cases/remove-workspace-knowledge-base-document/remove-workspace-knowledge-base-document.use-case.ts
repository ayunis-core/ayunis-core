import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { RemoveWorkspaceKnowledgeBaseDocumentUseCase as KnowledgeBaseOperationUseCase } from 'src/domain/knowledge-bases/application/use-cases/remove-workspace-knowledge-base-document/remove-workspace-knowledge-base-document.use-case';
@Injectable()
export class RemoveWorkspaceKnowledgeBaseDocumentUseCase {
  private readonly logger = new Logger(
    RemoveWorkspaceKnowledgeBaseDocumentUseCase.name,
  );
  constructor(
    private readonly access: WorkspaceAccessService,
    private readonly operation: KnowledgeBaseOperationUseCase,
  ) {}
  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: {
    workspaceId: UUID;
    knowledgeBaseId: UUID;
    documentId: UUID;
  }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'remove-workspace-knowledge-base-document',
    );
    await this.access.requireOwned(command.workspaceId);
    return this.operation.execute(command);
  }
}
