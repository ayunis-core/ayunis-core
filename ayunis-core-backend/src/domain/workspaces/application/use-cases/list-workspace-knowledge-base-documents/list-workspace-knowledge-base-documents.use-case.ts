import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { ListWorkspaceKnowledgeBaseDocumentsUseCase as KnowledgeBaseOperationUseCase } from 'src/domain/knowledge-bases/application/use-cases/list-workspace-knowledge-base-documents/list-workspace-knowledge-base-documents.use-case';
@Injectable()
export class ListWorkspaceKnowledgeBaseDocumentsUseCase {
  private readonly logger = new Logger(
    ListWorkspaceKnowledgeBaseDocumentsUseCase.name,
  );
  constructor(
    private readonly access: WorkspaceAccessService,
    private readonly operation: KnowledgeBaseOperationUseCase,
  ) {}
  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: { workspaceId: UUID; knowledgeBaseId: UUID }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'list-workspace-knowledge-base-documents',
    );
    await this.access.requireOwned(command.workspaceId);
    return this.operation.execute(command);
  }
}
