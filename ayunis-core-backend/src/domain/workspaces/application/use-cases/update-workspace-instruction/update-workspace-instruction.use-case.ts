import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { UpdateWorkspaceInstructionCommand } from './update-workspace-instruction.command';

@Injectable()
export class UpdateWorkspaceInstructionUseCase {
  constructor(
    @InjectPinoLogger(UpdateWorkspaceInstructionUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: UpdateWorkspaceInstructionCommand,
  ): Promise<Workspace> {
    this.logger.info(
      { workspaceId: command.workspaceId },
      'updateWorkspaceInstruction',
    );
    const { workspace } = await this.accessService.requireAccessLevel(
      command.workspaceId,
      WorkspaceAccessLevel.EDIT,
    );
    workspace.instruct(command.instruction?.trim() || null);
    return this.workspacesRepository.save(workspace);
  }
}
