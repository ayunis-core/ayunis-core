import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspacesRepository } from '../../ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from '../../workspaces.errors';
import { UpdateWorkspaceInstructionCommand } from './update-workspace-instruction.command';

@Injectable()
export class UpdateWorkspaceInstructionUseCase {
  constructor(
    @InjectPinoLogger(UpdateWorkspaceInstructionUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: UpdateWorkspaceInstructionCommand,
  ): Promise<Workspace> {
    this.logger.info(
      {
        workspaceId: command.workspaceId,
      },
      'updateWorkspaceInstruction',
    );
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    const workspace = await this.workspacesRepository.findById(
      userId,
      command.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(command.workspaceId);

    workspace.instruct(command.instruction?.trim() || null);
    return this.workspacesRepository.save(workspace);
  }
}
