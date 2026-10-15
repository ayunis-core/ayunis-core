import type { UUID } from 'crypto';
import type { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/workspace-access-level';
import type { WorkspaceSharingRights } from './workspace-sharing-rights';

export interface SharingMember {
  userId: UUID;
  name: string;
  affiliation: string | null;
  accessLevel: WorkspaceAccessLevel;
  isOwner: boolean;
  canChange: boolean;
}

export interface SharingTeamSection {
  teamId: UUID;
  name: string;
  accessLevel: WorkspaceAccessLevel;
  memberCount: number;
  members: SharingMember[];
  canEnd: boolean;
}

export interface WorkspaceInviters {
  managers: boolean;
  teamAdmins: boolean;
}

export interface WorkspaceSharingView {
  isSharedWithOrganization: boolean;
  memberCount: number;
  viewer: WorkspaceSharingRights;
  owner: SharingMember;
  people: SharingMember[];
  teams: SharingTeamSection[];
  organization: { memberCount: number; members: SharingMember[] } | null;
}

export interface WorkspaceSharingOverview extends WorkspaceSharingView {
  inviters: WorkspaceInviters;
}

export interface ShareCandidates {
  organization: { memberCount: number } | null;
  teams: {
    teamId: UUID;
    name: string;
    memberCount: number;
    memberIds: UUID[];
  }[];
  people: {
    userId: UUID;
    name: string;
    primaryTeam: { id: UUID; name: string } | null;
  }[];
}
