import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';

/**
 * Who may delete an artifact or convert it to a normal one: the owner of a
 * personal artifact, and the creator of a workspace artifact or the members
 * who may manage its workspace. Callers pass an artifact the user can see.
 */
@Injectable()
export class ArtifactManageAccessService {
  constructor(
    private readonly workspaceWriteAccess: AssertWorkspaceWriteAccessUseCase,
  ) {}

  /** @throws UnauthorizedAccessError for the workspace's other members */
  async assertCanManage(artifact: Artifact, userId: UUID): Promise<void> {
    if (artifact.owner.type === 'workspace' && artifact.creatorId !== userId) {
      await this.workspaceWriteAccess.execute({
        workspaceId: artifact.owner.workspaceId,
      });
    }
  }
}
