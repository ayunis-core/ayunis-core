import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { featuresConfig } from 'src/config/features.config';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';

@Injectable()
export class WorkspaceAccessService {
  constructor(
    private readonly repository: WorkspacesRepository,
    private readonly context: ContextService,
    @Inject(featuresConfig.KEY)
    private readonly features: ConfigType<typeof featuresConfig>,
  ) {}

  async requireOwned(workspaceId: UUID): Promise<void> {
    if (!this.features.workspacesEnabled) {
      throw new WorkspaceNotFoundError(workspaceId);
    }
    const userId = this.context.get('userId');
    const orgId = this.context.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();
    const workspace = await this.repository.findById(userId, workspaceId);
    if (workspace?.orgId !== orgId) {
      throw new WorkspaceNotFoundError(workspaceId);
    }
  }
}
