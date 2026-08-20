import type { UUID } from 'crypto';
import type { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';

export interface WorkspaceTeamMemberOverride {
  teamGrantId: UUID;
  userId: UUID;
  role: WorkspaceRole | null;
  excluded: boolean;
}

export type WorkspaceTeamMemberOverrideInput = Omit<
  WorkspaceTeamMemberOverride,
  'teamGrantId'
>;

export abstract class WorkspaceTeamMemberOverridesRepository {
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
