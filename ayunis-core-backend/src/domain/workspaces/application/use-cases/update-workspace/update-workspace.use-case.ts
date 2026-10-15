import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  WorkspaceSummaryService,
  type WorkspaceDetail,
} from 'src/domain/workspaces/application/services/workspace-summary.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { assertValidWorkspaceFields } from 'src/domain/workspaces/application/util/workspace-fields';
import { UpdateWorkspaceCommand } from './update-workspace.command';

@Injectable()
export class UpdateWorkspaceUseCase {
  private readonly logger = new Logger(UpdateWorkspaceUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly access: WorkspaceAccessService,
    private readonly summaries: WorkspaceSummaryService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  @Transactional()
  async execute(command: UpdateWorkspaceCommand): Promise<WorkspaceDetail> {
    this.logger.log({ workspaceId: command.id }, 'Updating workspace');

    await this.workspacesRepository.lockForUpdate(command.id);
    const { workspace, level } = await this.access.require(command.id, 'full');

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

    const saved = await this.workspacesRepository.save(workspace);
    return this.summaries.detail({ workspace: saved, level });
  }
}
