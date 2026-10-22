import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceSharingContextService } from 'src/domain/workspaces/application/services/workspace-sharing-context.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceInsufficientAccessError,
} from 'src/domain/workspaces/application/workspaces.errors';

@Injectable()
export class SetWorkspaceOrganizationSharingUseCase {
  private readonly logger = new Logger(
    SetWorkspaceOrganizationSharingUseCase.name,
  );

  constructor(private readonly sharing: WorkspaceSharingContextService) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  @Transactional()
  async execute(command: {
    workspaceId: UUID;
    shared: boolean;
  }): Promise<{ unlinkedCount: number }> {
    this.logger.log(command, 'Setting organisation sharing');
    const context = await this.sharing.load(command.workspaceId);
    if (!context.rights.canShareWithOrganization) {
      throw new WorkspaceInsufficientAccessError(command.workspaceId);
    }
    if (context.sharing.isSharedWithOrganization === command.shared) {
      return { unlinkedCount: 0 };
    }
    context.sharing.setSharedWithOrganization(command.shared);
    return this.sharing.save(context);
  }
}
