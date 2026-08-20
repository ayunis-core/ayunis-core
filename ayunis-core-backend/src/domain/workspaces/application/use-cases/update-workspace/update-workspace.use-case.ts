import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { assertValidWorkspaceFields } from 'src/domain/workspaces/application/util/workspace-fields';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { UpdateWorkspaceCommand } from './update-workspace.command';

@Injectable()
export class UpdateWorkspaceUseCase {
  constructor(
    @InjectPinoLogger(UpdateWorkspaceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: UpdateWorkspaceCommand): Promise<Workspace> {
    this.logger.info({ workspaceId: command.id }, 'Updating workspace');
    const { workspace } = await this.accessService.requireRole(
      command.id,
      WorkspaceRole.EDIT,
    );
    assertValidWorkspaceFields(command);

    if (command.name !== undefined) {
      workspace.rename(command.name);
    }
    if (command.description !== undefined) {
      workspace.describe(command.description);
    }
    if (command.icon !== undefined || command.color !== undefined) {
      workspace.restyle({ icon: command.icon, color: command.color });
    }

    return await this.workspacesRepository.save(workspace);
  }
}
