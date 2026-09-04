import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { DeleteKnowledgeBaseCommand } from 'src/domain/knowledge-bases/application/use-cases/delete-knowledge-base/delete-knowledge-base.command';
import { DeleteKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/delete-knowledge-base/delete-knowledge-base.use-case';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';

@Injectable()
export class DeleteWorkspaceKnowledgeBaseUseCase {
  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly deleteKnowledgeBaseUseCase: DeleteKnowledgeBaseUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(workspaceId: UUID, knowledgeBaseId: UUID): Promise<void> {
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();
    const workspace = await this.workspacesRepository.findById(
      userId,
      workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(workspaceId);
    await this.deleteKnowledgeBaseUseCase.execute(
      new DeleteKnowledgeBaseCommand({
        knowledgeBaseId,
        userId,
        workspaceId,
      }),
    );
  }
}
