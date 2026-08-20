import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { DetachKnowledgeBaseFromWorkspaceCommand } from './detach-knowledge-base-from-workspace.command';

@Injectable()
export class DetachKnowledgeBaseFromWorkspaceUseCase {
  constructor(
    @InjectPinoLogger(DetachKnowledgeBaseFromWorkspaceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly accessService: WorkspaceAccessService,
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
    await this.accessService.requireRole(
      command.workspaceId,
      WorkspaceRole.EDIT,
    );
    await this.workspacesRepository.detachKnowledgeBase(
      command.workspaceId,
      command.knowledgeBaseId,
    );
  }
}
