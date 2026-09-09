import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { WorkspaceKnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/workspace-knowledge-base-access.service';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';
import { DocumentNotInKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
@Injectable()
export class RemoveWorkspaceKnowledgeBaseDocumentUseCase {
  private readonly logger = new Logger(
    RemoveWorkspaceKnowledgeBaseDocumentUseCase.name,
  );
  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly access: WorkspaceKnowledgeBaseAccessService,
    private readonly deleteSource: DeleteSourceUseCase,
  ) {}
  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(command: {
    workspaceId: UUID;
    knowledgeBaseId: UUID;
    documentId: UUID;
  }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'remove-workspace-knowledge-base-document',
    );
    const knowledgeBase = await this.access.requireInWorkspace(
      command.workspaceId,
      command.knowledgeBaseId,
    );
    const source = await this.repository.findSourceByIdAndKnowledgeBaseId(
      command.documentId,
      command.knowledgeBaseId,
    );
    if (!source)
      throw new DocumentNotInKnowledgeBaseError(
        command.documentId,
        command.knowledgeBaseId,
      );
    await this.deleteSource.execute(
      new DeleteSourceCommand(command.documentId, knowledgeBase.orgId),
    );
  }
}
