import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
import { assertValidWorkspaceFields } from '../../util/workspace-fields';
import { UpdateWorkspaceCommand } from './update-workspace.command';

@Injectable()
export class UpdateWorkspaceUseCase {
  constructor(
    @InjectPinoLogger(UpdateWorkspaceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: UpdateWorkspaceCommand): Promise<Workspace> {
    this.logger.info({ workspaceId: command.id }, 'Updating workspace');

    const workspace = await this.workspacesRepository.findById(
      this.resolveUserId(),
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

    return await this.workspacesRepository.save(workspace);
  }

  private resolveUserId(): UUID {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    return userId;
  }
}
