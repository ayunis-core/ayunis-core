import type { UUID } from 'crypto';
import type { WorkspaceMember } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import type { WorkspaceTeamGrant } from 'src/domain/workspaces/application/ports/workspace-team-grants-repository.port';
import type { WorkspaceTeamMemberOverride } from 'src/domain/workspaces/application/ports/workspace-team-member-overrides-repository.port';

export interface WorkspaceTeamGrantSharing extends WorkspaceTeamGrant {
  id: UUID;
  overrides: WorkspaceTeamMemberOverride[];
}

export interface WorkspaceSharingSnapshot {
  members: WorkspaceMember[];
  teamGrants: WorkspaceTeamGrantSharing[];
}

export abstract class WorkspaceSharingReadRepository {
  abstract findSharing(workspaceId: UUID): Promise<WorkspaceSharingSnapshot>;
}
