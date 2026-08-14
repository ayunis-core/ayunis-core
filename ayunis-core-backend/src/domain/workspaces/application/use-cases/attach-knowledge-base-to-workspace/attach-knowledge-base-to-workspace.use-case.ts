import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import { WorkspacesRepository } from '../../ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from '../../workspaces.errors';
import { AttachKnowledgeBaseToWorkspaceCommand } from './attach-knowledge-base-to-workspace.command';

@Injectable()
export class AttachKnowledgeBaseToWorkspaceUseCase {
  constructor(
    @InjectPinoLogger(AttachKnowledgeBaseToWorkspaceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly knowledgeBaseAccessService: KnowledgeBaseAccessService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: AttachKnowledgeBaseToWorkspaceCommand): Promise<void> {
    this.logger.info(
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
