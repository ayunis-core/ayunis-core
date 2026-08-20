import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { AttachKnowledgeBaseToWorkspaceCommand } from './attach-knowledge-base-to-workspace.command';

@Injectable()
export class AttachKnowledgeBaseToWorkspaceUseCase {
  constructor(
    @InjectPinoLogger(AttachKnowledgeBaseToWorkspaceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly knowledgeBaseAccessService: KnowledgeBaseAccessService,
    private readonly accessService: WorkspaceAccessService,
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
    await this.accessService.requireRole(
      command.workspaceId,
      WorkspaceRole.EDIT,
    );
    await this.knowledgeBaseAccessService.findAccessibleKnowledgeBase(
      command.knowledgeBaseId,
    );
    await this.workspacesRepository.attachKnowledgeBase(
      command.workspaceId,
      command.knowledgeBaseId,
    );
  }
}
