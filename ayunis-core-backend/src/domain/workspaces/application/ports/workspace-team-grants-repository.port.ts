import type { UUID } from 'crypto';
import type { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';

export interface WorkspaceTeamGrant {
  workspaceId: UUID;
  teamId: UUID;
  accessLevel: WorkspaceAccessLevel;
}

export abstract class WorkspaceTeamGrantsRepository {
  abstract createGrant(
    grant: WorkspaceTeamGrant,
  ): Promise<WorkspaceTeamGrant | null>;

  abstract updateGrantAccessLevel(
    workspaceId: UUID,
    teamId: UUID,
    accessLevel: WorkspaceAccessLevel,
  ): Promise<WorkspaceTeamGrant | null>;

  abstract deleteGrant(workspaceId: UUID, teamId: UUID): Promise<boolean>;
}
