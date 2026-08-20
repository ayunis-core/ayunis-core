import type { UUID } from 'crypto';
import type { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';

export interface WorkspaceTeamGrant {
  workspaceId: UUID;
  teamId: UUID;
  role: WorkspaceRole;
}

export abstract class WorkspaceTeamGrantsRepository {
  abstract createGrant(
    grant: WorkspaceTeamGrant,
  ): Promise<WorkspaceTeamGrant | null>;

  abstract updateGrantRole(
    workspaceId: UUID,
    teamId: UUID,
    role: WorkspaceRole,
  ): Promise<WorkspaceTeamGrant | null>;

  abstract deleteGrant(workspaceId: UUID, teamId: UUID): Promise<boolean>;
}
