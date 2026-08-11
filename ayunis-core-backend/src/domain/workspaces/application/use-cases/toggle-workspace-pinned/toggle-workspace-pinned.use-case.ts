import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { ToggleWorkspacePinnedCommand } from './toggle-workspace-pinned.command';

@Injectable()
export class ToggleWorkspacePinnedUseCase {
  private readonly logger = new Logger(ToggleWorkspacePinnedUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: ToggleWorkspacePinnedCommand): Promise<Workspace> {
    this.logger.log('Toggling workspace pin', {
      workspaceId: command.workspaceId,
    });

    const userId = this.resolveUserId();
    const workspace = await this.workspacesRepository.findById(
      userId,
      command.workspaceId,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError(command.workspaceId);
    }

    workspace.isPinned = await this.workspacesRepository.togglePinned(
      userId,
      command.workspaceId,
    );
    return workspace;
  }

  private resolveUserId(): UUID {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    return userId;
  }
}
