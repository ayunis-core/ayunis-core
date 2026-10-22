import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceOwnershipService } from 'src/domain/workspaces/application/services/workspace-ownership.service';
import { WorkspaceSharingContextService } from 'src/domain/workspaces/application/services/workspace-sharing-context.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceOwnerOnlyError,
} from 'src/domain/workspaces/application/workspaces.errors';

export interface OwnershipCandidate {
  id: UUID;
  name: string;
  affiliation: string | null;
}

@Injectable()
export class ListOwnershipCandidatesUseCase {
  private readonly logger = new Logger(ListOwnershipCandidatesUseCase.name);

  constructor(
    private readonly sharing: WorkspaceSharingContextService,
    private readonly ownership: WorkspaceOwnershipService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(query: { workspaceId: UUID }): Promise<OwnershipCandidate[]> {
    this.logger.log(
      { workspaceId: query.workspaceId },
      'Listing ownership candidates',
    );
    const { workspace, sharing, directory, rights } = await this.sharing.load(
      query.workspaceId,
    );
    if (rights.accessLevel !== 'owner') {
      throw new WorkspaceOwnerOnlyError(workspace.id);
    }
    return this.ownership
      .candidatesOf(sharing, directory)
      .map(({ id, name }) => ({
        id,
        name,
        affiliation: directory.affiliationOf(id),
      }));
  }
}
