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
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UpdateWorkspaceInstructionCommand } from './update-workspace-instruction.command';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class UpdateWorkspaceInstructionUseCase {
  private readonly logger = new Logger(UpdateWorkspaceInstructionUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: UpdateWorkspaceInstructionCommand,
  ): Promise<AccessibleWorkspace> {
    this.logger.log(
      {
        workspaceId: command.workspaceId,
      },
      'updateWorkspaceInstruction',
    );
    const access = await this.workspaceAccess.requirePermission(
      command.workspaceId,
      Permission.MANAGE_WORKSPACE,
    );
    const { userId } = getRequiredUserContext(this.contextService);

    const workspace = await this.workspacesRepository.findById(
      userId,
      command.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(command.workspaceId);

    workspace.instruct(command.instruction?.trim() || null);
    return {
      workspace: await this.workspacesRepository.save(workspace),
      access,
    };
  }
}
