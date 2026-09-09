import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { FindWorkspaceKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-workspace-knowledge-base/find-workspace-knowledge-base.use-case';
import { CountKnowledgeBaseDocumentsUseCase } from 'src/domain/knowledge-bases/application/use-cases/count-knowledge-base-documents/count-knowledge-base-documents.use-case';
@Injectable()
export class GetWorkspaceKnowledgeBaseUseCase {
  private readonly logger = new Logger(GetWorkspaceKnowledgeBaseUseCase.name);
  constructor(
    private readonly access: WorkspaceAccessService,
    private readonly find: FindWorkspaceKnowledgeBaseUseCase,
    private readonly count: CountKnowledgeBaseDocumentsUseCase,
  ) {}
  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: { workspaceId: UUID; knowledgeBaseId: UUID }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'get-workspace-knowledge-base',
    );
    await this.access.requireOwned(command.workspaceId);
    const { knowledgeBase, isActive } = await this.find.execute(command);
    const counts = await this.count.execute({
      knowledgeBaseIds: [command.knowledgeBaseId],
    });
    return {
      id: knowledgeBase.id,
      name: knowledgeBase.name,
      description: knowledgeBase.description || null,
      isActive,
      documentCount: counts.get(knowledgeBase.id) ?? 0,
    };
  }
}
