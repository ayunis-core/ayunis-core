import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { UpdateWorkspaceInstructionCommand } from './update-workspace-instruction.command';

@Injectable()
export class UpdateWorkspaceInstructionUseCase {
  private readonly logger = new Logger(UpdateWorkspaceInstructionUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly access: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: UpdateWorkspaceInstructionCommand,
  ): Promise<Workspace> {
    this.logger.log(
      {
        workspaceId: command.workspaceId,
      },
      'updateWorkspaceInstruction',
    );
    const { workspace } = await this.access.require(
      command.workspaceId,
      'edit',
    );
    workspace.instruct(command.instruction?.trim() || null);
    return this.workspacesRepository.save(workspace);
  }
}
