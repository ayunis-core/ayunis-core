import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class WorkspaceAccessService {
  constructor(
    private readonly repository: WorkspacesRepository,
    private readonly context: ContextService,
  ) {}

  async requireOwned(workspaceId: UUID): Promise<void> {
    const { userId, orgId } = getRequiredUserContext(this.context);
    const workspace = await this.repository.findById(userId, workspaceId);
    if (workspace?.orgId !== orgId) {
      throw new WorkspaceNotFoundError(workspaceId);
    }
  }
}
