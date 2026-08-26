import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { WorkspaceAccessRepository } from 'src/domain/workspaces/application/ports/workspace-access-repository.port';
import {
  WorkspaceInsufficientAccessLevelError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import {
  WorkspaceAccessPolicyService,
  type WorkspaceAccessResolution,
} from './workspace-access-policy.service';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { WorkspaceVisibility } from 'src/domain/workspaces/domain/value-objects/workspace-visibility.enum';
import { ListMyTeamsUseCase } from 'src/iam/teams/application/use-cases/list-my-teams/list-my-teams.use-case';

export interface ResolvedWorkspaceAccess extends WorkspaceAccessResolution {
  workspace: Workspace;
}

@Injectable()
export class WorkspaceAccessService {
  constructor(
    @InjectPinoLogger(WorkspaceAccessService.name)
    private readonly logger: PinoLogger,
    private readonly repository: WorkspaceAccessRepository,
    private readonly policy: WorkspaceAccessPolicyService,
    private readonly listMyTeamsUseCase: ListMyTeamsUseCase,
    private readonly contextService: ContextService,
  ) {}

  async resolve(workspaceId: UUID): Promise<ResolvedWorkspaceAccess | null> {
    const { userId, orgId } = this.getContext();
    this.logger.info({ workspaceId }, 'Resolving workspace access');
    const teams = await this.listMyTeamsUseCase.execute();
    const snapshot = await this.repository.findAccessSnapshot({
      workspaceId,
      orgId,
      userId,
      teamIds: teams.map(({ id }) => id),
    });
    if (!snapshot) return null;

    const resolution = this.policy.resolve({
      isOwner: snapshot.workspace.userId === userId,
      directMembership: snapshot.directMembership,
      teamGrants: snapshot.teamGrants,
      organizationVisible:
        snapshot.workspace.visibility === WorkspaceVisibility.ORGANIZATION,
    });
    return resolution ? { workspace: snapshot.workspace, ...resolution } : null;
  }

  async requireAccessLevel(
    workspaceId: UUID,
    minimumAccessLevel: WorkspaceAccessLevel,
  ): Promise<ResolvedWorkspaceAccess> {
    const access = await this.resolve(workspaceId);
    if (!access) throw new WorkspaceNotFoundError(workspaceId);
    if (
      !this.policy.hasMinimumAccessLevel(access.accessLevel, minimumAccessLevel)
    ) {
      throw new WorkspaceInsufficientAccessLevelError(
        workspaceId,
        minimumAccessLevel,
        access.accessLevel,
      );
    }
    return access;
  }

  private getContext(): { userId: UUID; orgId: UUID } {
    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();
    return { userId, orgId };
  }
}
