import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { FindWorkspaceKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-workspace-knowledge-base/find-workspace-knowledge-base.use-case';
import { AddDocumentToKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/add-document-to-knowledge-base/add-document-to-knowledge-base.use-case';
import type { AddDocumentToKnowledgeBaseCommand } from 'src/domain/knowledge-bases/application/use-cases/add-document-to-knowledge-base/add-document-to-knowledge-base.command';
import type { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';

@Injectable()
export class AddWorkspaceKnowledgeBaseDocumentUseCase {
  private readonly logger = new Logger(
    AddWorkspaceKnowledgeBaseDocumentUseCase.name,
  );
  constructor(
    private readonly findKnowledgeBase: FindWorkspaceKnowledgeBaseUseCase,
    private readonly addDocument: AddDocumentToKnowledgeBaseUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: AddDocumentToKnowledgeBaseCommand & { workspaceId: UUID },
  ): Promise<FileSource> {
    this.logger.log(
      {
        workspaceId: command.workspaceId,
        knowledgeBaseId: command.knowledgeBaseId,
      },
      'Adding document to workspace knowledge base',
    );
    await this.findKnowledgeBase.execute({
      workspaceId: command.workspaceId,
      knowledgeBaseId: command.knowledgeBaseId,
    });
    return this.addDocument.execute({
      knowledgeBaseId: command.knowledgeBaseId,
      file: command.file,
    });
  }
}
