import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { WorkspaceKnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/workspace-knowledge-base-access.service';
@Injectable()
export class ListWorkspaceKnowledgeBaseDocumentsUseCase {
  private readonly logger = new Logger(
    ListWorkspaceKnowledgeBaseDocumentsUseCase.name,
  );
  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly access: WorkspaceKnowledgeBaseAccessService,
  ) {}
  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(command: { workspaceId: UUID; knowledgeBaseId: UUID }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'list-workspace-knowledge-base-documents',
    );
    await this.access.requireInWorkspace(
      command.workspaceId,
      command.knowledgeBaseId,
    );
    return this.repository.findSourcesByKnowledgeBaseId(
      command.knowledgeBaseId,
    );
  }
}
