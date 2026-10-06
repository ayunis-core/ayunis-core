export type Role = 'orgAdmin' | 'teamAdmin' | 'member' | 'workspaceOwner';

export type WorkspaceAccess = 'owner' | 'manage' | 'edit' | 'use';

export type MemberAccess = Exclude<WorkspaceAccess, 'owner'>;

export type SkillFilter = 'all' | 'own';

export type SkillGroup = 'own' | 'team' | 'org';

export interface Person {
  id: string;
  name: string;
  department: string;
  email: string;
  teamIds: string[];
}

export interface SidebarChat {
  id: string;
  title: string;
}

export interface PersonSidebar {
  favoriteChats: SidebarChat[];
  chats: SidebarChat[];
}

export interface Team {
  id: string;
  name: string;
  memberCount: number;
  adminIds: string[];
}

export type SkillOwner =
  | { kind: 'org' }
  | { kind: 'team'; teamId: string }
  | { kind: 'user'; userId: string }
  | { kind: 'workspace'; workspaceId: string };

export interface OwnedItem {
  id: string;
  name: string;
  owner: SkillOwner;
  submittedBy?: string;
}

export type ResourceKind = 'skill' | 'knowledge';

export interface PrototypeSkill extends OwnedItem {
  shortDescription: string;
  fromMarketplace?: boolean;
  updatedAt?: string;
}

export type TransferTarget = { kind: 'team'; teamId: string } | { kind: 'org' };

export interface TransferRequest {
  resource: ResourceKind;
  itemId: string;
  target: TransferTarget;
  requestedBy: string;
  requestedAt: string;
}

export interface LinkedSkill {
  skillId: string;
  linkedBy: string;
}

export interface PrototypeKnowledge extends OwnedItem {
  description: string;
  documentCount: number;
}

export interface LinkedKnowledge {
  knowledgeId: string;
  linkedBy: string;
}

export interface WorkspaceKnowledge {
  id: string;
  name: string;
  description?: string;
}

export interface WorkspaceArtifact {
  id: string;
  title: string;
  kind: 'Dokument' | 'Tabelle' | 'Diagramm';
  updatedAt: string;
}

export interface WorkspaceMember {
  personId: string;
  access: MemberAccess;
}

export type TeamMemberOverride = MemberAccess | 'excluded';

export interface WorkspaceTeamGrant {
  teamId: string;
  access: MemberAccess;
  overrides?: Partial<Record<string, TeamMemberOverride>>;
}

export interface WorkspaceShares {
  members: WorkspaceMember[];
  teamGrants: WorkspaceTeamGrant[];
  isOrgVisible: boolean;
  orgExcludedIds: string[];
}

export interface PrototypeWorkspace {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  ownerId: string;
  members: WorkspaceMember[];
  teamGrants?: WorkspaceTeamGrant[];
  isOrgVisible?: boolean;
  orgExcludedIds?: string[];
  linkedSkills: LinkedSkill[];
  chats: SidebarChat[];
  artifacts: WorkspaceArtifact[];
  knowledgeBases: string[];
  instructions: string;
}

export type WorkspaceDetails = Pick<
  PrototypeWorkspace,
  'name' | 'description' | 'icon' | 'color' | 'ownerId'
>;
