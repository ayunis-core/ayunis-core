import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { AttachKnowledgeBaseToWorkspaceCommand } from './attach-knowledge-base-to-workspace.command';

@Injectable()
export class AttachKnowledgeBaseToWorkspaceUseCase {
  private readonly logger = new Logger(
    AttachKnowledgeBaseToWorkspaceUseCase.name,
  );

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly knowledgeBaseAccessService: KnowledgeBaseAccessService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: AttachKnowledgeBaseToWorkspaceCommand): Promise<void> {
    this.logger.log(
      {
        workspaceId: command.workspaceId,
        knowledgeBaseId: command.knowledgeBaseId,
      },
      'attachKnowledgeBaseToWorkspace',
    );
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    const workspace = await this.workspacesRepository.findById(
      userId,
      command.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(command.workspaceId);

    await this.knowledgeBaseAccessService.findAccessibleKnowledgeBase(
      command.knowledgeBaseId,
    );
    await this.workspacesRepository.attachKnowledgeBase(
      command.workspaceId,
      command.knowledgeBaseId,
    );
  }
}
