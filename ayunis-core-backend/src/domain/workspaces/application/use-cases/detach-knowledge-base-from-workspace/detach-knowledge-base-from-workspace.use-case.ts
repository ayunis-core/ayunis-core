import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { DetachKnowledgeBaseFromWorkspaceCommand } from './detach-knowledge-base-from-workspace.command';

@Injectable()
export class DetachKnowledgeBaseFromWorkspaceUseCase {
  private readonly logger = new Logger(
    DetachKnowledgeBaseFromWorkspaceUseCase.name,
  );

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: DetachKnowledgeBaseFromWorkspaceCommand,
  ): Promise<void> {
    this.logger.log(
      {
        workspaceId: command.workspaceId,
        knowledgeBaseId: command.knowledgeBaseId,
      },
      'detachKnowledgeBaseFromWorkspace',
    );
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    const workspace = await this.workspacesRepository.findById(
      userId,
      command.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(command.workspaceId);

    await this.workspacesRepository.detachKnowledgeBase(
      command.workspaceId,
      command.knowledgeBaseId,
    );
  }
}
