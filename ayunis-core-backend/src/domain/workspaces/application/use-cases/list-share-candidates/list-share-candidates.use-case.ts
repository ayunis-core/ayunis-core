import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { ShareCandidates } from 'src/domain/workspaces/application/models/workspace-sharing-view';
import { WorkspaceSharingContextService } from 'src/domain/workspaces/application/services/workspace-sharing-context.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceInsufficientAccessError,
} from 'src/domain/workspaces/application/workspaces.errors';

@Injectable()
export class ListShareCandidatesUseCase {
  private readonly logger = new Logger(ListShareCandidatesUseCase.name);

  constructor(private readonly sharing: WorkspaceSharingContextService) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(query: { workspaceId: UUID }): Promise<ShareCandidates> {
    this.logger.log(query, 'Listing share candidates');
    const context = await this.sharing.load(query.workspaceId);
    const { rights } = context;
    if (!rights.canInvite && !rights.canShareWithOrganization) {
      throw new WorkspaceInsufficientAccessError(query.workspaceId);
    }
    return context.builder.candidates();
  }
}
