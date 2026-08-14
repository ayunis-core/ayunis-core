import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { WorkspacesRepository } from '../../ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from '../../workspaces.errors';
import { DetachKnowledgeBaseFromWorkspaceCommand } from './detach-knowledge-base-from-workspace.command';

@Injectable()
export class DetachKnowledgeBaseFromWorkspaceUseCase {
  constructor(
    @InjectPinoLogger(DetachKnowledgeBaseFromWorkspaceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: DetachKnowledgeBaseFromWorkspaceCommand,
  ): Promise<void> {
    this.logger.info(
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
