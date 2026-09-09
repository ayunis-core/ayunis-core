import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';

@Injectable()
export class WorkspaceAccessService {
  constructor(
    private readonly repository: WorkspacesRepository,
    private readonly context: ContextService,
  ) {}

  async requireOwned(workspaceId: UUID): Promise<void> {
    const userId = this.context.get('userId');
    if (!userId) throw new UnauthorizedAccessError();
    if (!(await this.repository.findById(userId, workspaceId))) {
      throw new WorkspaceNotFoundError(workspaceId);
    }
  }
}
