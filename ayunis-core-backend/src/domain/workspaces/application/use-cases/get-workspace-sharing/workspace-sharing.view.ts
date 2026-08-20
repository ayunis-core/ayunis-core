import type { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import type { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import type { WorkspaceVisibility } from 'src/domain/workspaces/domain/value-objects/workspace-visibility.enum';
import type { Team } from 'src/iam/teams/domain/team.entity';
import type { User } from 'src/iam/users/domain/user.entity';

export interface WorkspaceSharingMemberView {
  user: User;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
}

export interface WorkspaceSharingOverrideView {
  user: User;
  role: WorkspaceRole | null;
  excluded: boolean;
}

export interface WorkspaceSharingTeamGrantView {
  team: Team;
  memberCount: number;
  role: WorkspaceRole;
  overrides: WorkspaceSharingOverrideView[];
}

export interface WorkspaceSharingAvailableTeamView {
  team: Team;
  memberCount: number;
}

export interface WorkspaceSharingView {
  visibility: WorkspaceVisibility;
  owner: User;
  availableTeams: WorkspaceSharingAvailableTeamView[];
  members: WorkspaceSharingMemberView[];
  teamGrants: WorkspaceSharingTeamGrantView[];
}
