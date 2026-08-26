import type { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import type { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import type { Team } from 'src/iam/teams/domain/team.entity';
import type { User } from 'src/iam/users/domain/user.entity';

export interface WorkspaceSharingMemberView {
  user: User;
  accessLevel: WorkspaceAccessLevel;
  status: WorkspaceMemberStatus;
}

export interface WorkspaceSharingOverrideView {
  user: User;
  accessLevel: WorkspaceAccessLevel | null;
  excluded: boolean;
}

export interface WorkspaceSharingTeamGrantView {
  team: Team;
  memberCount: number;
  accessLevel: WorkspaceAccessLevel;
  overrides: WorkspaceSharingOverrideView[];
}

export interface WorkspaceSharingView {
  members: WorkspaceSharingMemberView[];
  teamGrants: WorkspaceSharingTeamGrantView[];
}
