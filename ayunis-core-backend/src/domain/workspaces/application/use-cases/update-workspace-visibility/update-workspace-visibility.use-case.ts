import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { UpdateWorkspaceVisibilityCommand } from './update-workspace-visibility.command';

@Injectable()
export class UpdateWorkspaceVisibilityUseCase {
  constructor(
    @InjectPinoLogger(UpdateWorkspaceVisibilityUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: UpdateWorkspaceVisibilityCommand): Promise<Workspace> {
    this.logger.info(
      { workspaceId: command.workspaceId, visibility: command.visibility },
      'Updating workspace visibility',
    );
    const { workspace } = await this.accessService.requireRole(
      command.workspaceId,
      WorkspaceRole.FULL,
    );
    workspace.changeVisibility(command.visibility);
    return this.workspacesRepository.save(workspace);
  }
}
