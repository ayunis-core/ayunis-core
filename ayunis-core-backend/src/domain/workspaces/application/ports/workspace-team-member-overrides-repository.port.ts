import type { UUID } from 'crypto';
import type { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';

export interface WorkspaceTeamMemberOverride {
  teamGrantId: UUID;
  userId: UUID;
  accessLevel: WorkspaceAccessLevel | null;
  excluded: boolean;
}

export type WorkspaceTeamMemberOverrideInput = Omit<
  WorkspaceTeamMemberOverride,
  'teamGrantId'
>;

export abstract class WorkspaceTeamMemberOverridesRepository {
  abstract hasTeamGrant(workspaceId: UUID, teamId: UUID): Promise<boolean>;

  abstract upsertOverride(
    workspaceId: UUID,
    teamId: UUID,
    override: WorkspaceTeamMemberOverrideInput,
  ): Promise<WorkspaceTeamMemberOverride | null>;

  abstract deleteOverride(
    workspaceId: UUID,
    teamId: UUID,
    userId: UUID,
  ): Promise<boolean>;
}
