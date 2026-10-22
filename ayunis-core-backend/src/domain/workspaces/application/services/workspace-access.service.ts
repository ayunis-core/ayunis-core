import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import type { WorkspaceAccess } from 'src/domain/workspaces/application/models/workspace-access';
import { WorkspaceSharingRepository } from 'src/domain/workspaces/application/ports/workspace-sharing.repository';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  WorkspaceInsufficientAccessError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import {
  hasAtLeast,
  type WorkspaceAccessLevel,
} from 'src/domain/workspaces/domain/workspace-access-level';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { ListMyTeamsUseCase } from 'src/iam/teams/application/use-cases/list-my-teams/list-my-teams.use-case';

@Injectable()
export class WorkspaceAccessService {
  constructor(
    private readonly repository: WorkspacesRepository,
    private readonly sharingRepository: WorkspaceSharingRepository,
    private readonly context: ContextService,
    private readonly listMyTeams: ListMyTeamsUseCase,
  ) {}

  async require(
    workspaceId: UUID,
    minimum: WorkspaceAccessLevel,
  ): Promise<WorkspaceAccess> {
    const access = await this.resolve(workspaceId);
    if (!hasAtLeast(access.level, minimum)) {
      throw new WorkspaceInsufficientAccessError(workspaceId);
    }
    return access;
  }

  async levelsOf(
    workspaces: Workspace[],
  ): Promise<Map<UUID, WorkspaceAccessLevel>> {
    const { userId } = getRequiredUserContext(this.context);
    const [sharings, teamIds] = await Promise.all([
      this.sharingRepository.loadMany(workspaces),
      this.myTeamIds(),
    ]);
    const levels = new Map<UUID, WorkspaceAccessLevel>();
    for (const [workspaceId, sharing] of sharings) {
      const level = sharing.levelOf(userId, teamIds);
      if (level) levels.set(workspaceId, level);
    }
    return levels;
  }

  private async resolve(workspaceId: UUID): Promise<WorkspaceAccess> {
    const { userId, orgId } = getRequiredUserContext(this.context);
    const workspace = await this.repository.findOne(workspaceId);
    if (workspace?.orgId !== orgId) {
      throw new WorkspaceNotFoundError(workspaceId);
    }
    if (workspace.userId === userId) return { workspace, level: 'owner' };
    const level = (await this.levelsOf([workspace])).get(workspace.id);
    if (!level) throw new WorkspaceNotFoundError(workspaceId);
    return { workspace, level };
  }

  private async myTeamIds(): Promise<UUID[]> {
    return (await this.listMyTeams.execute()).map(({ id }) => id);
  }
}
