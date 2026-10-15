import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { WorkspaceOwnershipService } from 'src/domain/workspaces/application/services/workspace-ownership.service';
import {
  WorkspaceSharingContextService,
  type SharingContext,
} from 'src/domain/workspaces/application/services/workspace-sharing-context.service';
import {
  WorkspaceSummaryService,
  type WorkspaceDetail,
} from 'src/domain/workspaces/application/services/workspace-summary.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceOwnerOnlyError,
  WorkspaceTransferTargetNotEligibleError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { TransferWorkspaceOwnershipCommand } from './transfer-workspace-ownership.command';

@Injectable()
export class TransferWorkspaceOwnershipUseCase {
  private readonly logger = new Logger(TransferWorkspaceOwnershipUseCase.name);

  constructor(
    private readonly sharing: WorkspaceSharingContextService,
    private readonly ownership: WorkspaceOwnershipService,
    private readonly access: WorkspaceAccessService,
    private readonly summaries: WorkspaceSummaryService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  @Transactional()
  async execute(
    command: TransferWorkspaceOwnershipCommand,
  ): Promise<WorkspaceDetail> {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'Transferring workspace ownership',
    );
    const context = await this.sharing.loadForChange(command.workspaceId);
    if (context.rights.accessLevel !== 'owner') {
      throw new WorkspaceOwnerOnlyError(context.workspace.id);
    }
    if (!this.mayTakeOver(context, command)) {
      throw new WorkspaceTransferTargetNotEligibleError(
        context.workspace.id,
        command.userId,
      );
    }
    await this.ownership.transfer(
      context.sharing,
      command.userId,
      context.directory,
    );
    return this.summaries.detail(
      await this.access.require(context.workspace.id, 'use'),
    );
  }

  private mayTakeOver(
    { sharing, directory }: SharingContext,
    { userId }: TransferWorkspaceOwnershipCommand,
  ): boolean {
    return (
      userId !== sharing.ownerId &&
      directory.person(userId) !== undefined &&
      sharing.hasAccess(userId, directory)
    );
  }
}
