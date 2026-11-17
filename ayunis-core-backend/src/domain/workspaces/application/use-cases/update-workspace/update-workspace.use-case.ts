import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import type { AccessibleWorkspace } from 'src/domain/workspaces/application/models/workspace-access.model';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { assertValidWorkspaceFields } from 'src/domain/workspaces/application/util/workspace-fields';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UpdateWorkspaceCommand } from './update-workspace.command';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class UpdateWorkspaceUseCase {
  private readonly logger = new Logger(UpdateWorkspaceUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: UpdateWorkspaceCommand): Promise<AccessibleWorkspace> {
    this.logger.log({ workspaceId: command.id }, 'Updating workspace');

    const access = await this.workspaceAccess.requirePermission(
      command.id,
      Permission.MANAGE_WORKSPACE,
    );
    const { userId } = getRequiredUserContext(this.contextService);
    const workspace = await this.workspacesRepository.findById(
      userId,
      command.id,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError(command.id);
    }

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

    return {
      workspace: await this.workspacesRepository.save(workspace),
      access,
    };
  }
}
