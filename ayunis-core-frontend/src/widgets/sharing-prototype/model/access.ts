import { ORG, PEOPLE, ROLE_PERSON, TEAMS } from './fixtures';
import { EXTRA_PEOPLE } from './member-fixtures';
import type { PermissionKey, TeamAdminPermissionKey } from './permissions';
import type {
  LinkedKnowledge,
  MemberAccess,
  OwnedItem,
  Person,
  PrototypeKnowledge,
  PrototypeSkill,
  PrototypeWorkspace,
  ResourceKind,
  Role,
  SkillGroup,
  Team,
  TransferTarget,
  WorkspaceAccess,
  WorkspaceKnowledge,
  WorkspaceShares,
  WorkspaceTeamGrant,
} from './types';
import {
  deletedWorkspaceIds,
  readState,
  removedFromTeam,
  roleMay,
  teamAdminMay,
  teamAdminOverride,
  workspaceDetailsOverride,
  workspaceSharesOverride,
} from './prototype-store';
import { WORKSPACES } from './workspace-fixtures';

export function personForRole(role: Role): Person {
  return findPerson(ROLE_PERSON[role]);
}

export function allPeople(): Person[] {
  return [...PEOPLE, ...EXTRA_PEOPLE].map((person) => findPerson(person.id));
}

export function findPerson(id: string): Person {
  const person = [...PEOPLE, ...EXTRA_PEOPLE].find(
    (candidate) => candidate.id === id,
  );
  if (!person) throw new Error(`Unknown person ${id}`);
  return {
    ...person,
    teamIds: person.teamIds.filter(
      (teamId) => !removedFromTeam(teamId).includes(id),
    ),
  };
}

export function findTeam(id: string): Team {
  const team = TEAMS.find((candidate) => candidate.id === id);
  if (!team) throw new Error(`Unknown team ${id}`);
  const removed = removedFromTeam(id);
  return {
    ...team,
    memberCount: team.memberCount - removed.length,
    adminIds: (teamAdminOverride(id) ?? team.adminIds).filter(
      (adminId) => !removed.includes(adminId),
    ),
  };
}

export function allTeams(): Team[] {
  return TEAMS.map((team) => findTeam(team.id));
}

export function teamMembers(teamId: string): Person[] {
  return [...PEOPLE, ...EXTRA_PEOPLE]
    .map((person) => findPerson(person.id))
    .filter((person) => person.teamIds.includes(teamId))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function teamAdminIdsWith(
  teamId: string,
  key: TeamAdminPermissionKey,
): string[] {
  return teamAdminMay(key) ? findTeam(teamId).adminIds : [];
}

export function firstName(person: Person): string {
  return person.name.split(' ')[0];
}

export function skillGroupFor(
  item: OwnedItem,
  person: Person,
): SkillGroup | null {
  const { owner } = item;
  if (owner.kind === 'org') return 'org';
  if (owner.kind === 'team') {
    return person.teamIds.includes(owner.teamId) ? 'team' : null;
  }
  if (owner.kind === 'user') return owner.userId === person.id ? 'own' : null;
  return null;
}

export function availableSkills<T extends OwnedItem>(
  skills: T[],
  person: Person,
): T[] {
  return skills
    .filter((skill) => skillGroupFor(skill, person) !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function skillsInGroup<T extends OwnedItem>(
  skills: T[],
  group: SkillGroup,
  person: Person,
): T[] {
  return skills
    .filter((skill) => skillGroupFor(skill, person) === group)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function isTeamAdminWith(
  teamId: string,
  person: Person,
  key: TeamAdminPermissionKey,
): boolean {
  return findTeam(teamId).adminIds.includes(person.id) && teamAdminMay(key);
}

export function teamManageKey(resource: ResourceKind): TeamAdminPermissionKey {
  return resource === 'skill' ? 'team_manage_skills' : 'team_manage_knowledge';
}

export function orgManageKey(resource: ResourceKind): PermissionKey {
  return resource === 'skill' ? 'manage_org_skills' : 'manage_org_knowledge';
}

export function canEditSkill(
  item: OwnedItem,
  person: Person,
  role: Role,
  resource: ResourceKind = 'skill',
): boolean {
  const { owner } = item;
  if (owner.kind === 'user') return owner.userId === person.id;
  if (owner.kind === 'team') {
    return (
      role === 'orgAdmin' ||
      isTeamAdminWith(owner.teamId, person, teamManageKey(resource))
    );
  }
  if (owner.kind === 'org') return roleMay(role, orgManageKey(resource));
  return canEditWorkspace(findWorkspace(owner.workspaceId), person);
}

export function findSkill(
  skills: PrototypeSkill[],
  id: string,
): PrototypeSkill | undefined {
  return skills.find((skill) => skill.id === id);
}

export function allWorkspaces(): PrototypeWorkspace[] {
  const deleted = deletedWorkspaceIds();
  return WORKSPACES.filter((workspace) => !deleted.includes(workspace.id)).map(
    (workspace) => findWorkspace(workspace.id),
  );
}

export function linkedWorkspaceCount(
  resource: ResourceKind,
  itemId: string,
): number {
  const { linkedSkills, linkedKnowledge } = readState();
  return allWorkspaces().filter((workspace) =>
    resource === 'skill'
      ? (linkedSkills[workspace.id] ?? []).some(
          (link) => link.skillId === itemId,
        )
      : (linkedKnowledge[workspace.id] ?? []).some(
          (link) => link.knowledgeId === itemId,
        ),
  ).length;
}

export function canUseSkill(item: OwnedItem, person: Person): boolean {
  return (
    item.owner.kind === 'workspace' || skillGroupFor(item, person) !== null
  );
}

export function findWorkspace(id: string): PrototypeWorkspace {
  const workspace = WORKSPACES.find((candidate) => candidate.id === id);
  if (!workspace) throw new Error(`Unknown workspace ${id}`);
  return {
    ...workspace,
    ...workspaceDetailsOverride(id),
    ...workspaceSharesOverride(id),
  };
}

export function sharesOf(workspace: PrototypeWorkspace): WorkspaceShares {
  return {
    members: workspace.members,
    teamGrants: workspace.teamGrants ?? [],
    isOrgVisible: workspace.isOrgVisible ?? false,
    orgExcludedIds: workspace.orgExcludedIds ?? [],
  };
}

const ACCESS_RANK: Record<MemberAccess, number> = {
  use: 1,
  edit: 2,
  manage: 3,
};

function accessCandidates(
  workspace: PrototypeWorkspace,
  person: Person,
): MemberAccess[] {
  const shares = sharesOf(workspace);
  const direct = shares.members
    .filter((member) => member.personId === person.id)
    .map((member) => member.access);
  const viaTeams = shares.teamGrants
    .filter((grant) => person.teamIds.includes(grant.teamId))
    .flatMap((grant) => {
      const override = grant.overrides?.[person.id];
      if (override === 'excluded') return [];
      return [override ?? grant.access];
    });
  const viaOrg: MemberAccess[] =
    shares.isOrgVisible && !shares.orgExcludedIds.includes(person.id)
      ? ['use']
      : [];
  return [...direct, ...viaTeams, ...viaOrg];
}

export function workspaceAccessOf(
  workspace: PrototypeWorkspace,
  person: Person,
): WorkspaceAccess | null {
  if (workspace.ownerId === person.id) return 'owner';
  const candidates = accessCandidates(workspace, person);
  if (candidates.length === 0) return null;
  return candidates.reduce(
    (best, access) => (ACCESS_RANK[access] > ACCESS_RANK[best] ? access : best),
    candidates[0],
  );
}

export function canEditWorkspace(
  workspace: PrototypeWorkspace,
  person: Person,
): boolean {
  const access = workspaceAccessOf(workspace, person);
  return access !== null && access !== 'use';
}

export function canManageWorkspace(
  workspace: PrototypeWorkspace,
  person: Person,
): boolean {
  const access = workspaceAccessOf(workspace, person);
  return access === 'owner' || access === 'manage';
}

export function includedTeamMembers(grant: WorkspaceTeamGrant): Person[] {
  return teamMembers(grant.teamId).filter(
    (member) => grant.overrides?.[member.id] !== 'excluded',
  );
}

export function teamPlacementOf(
  workspace: PrototypeWorkspace,
  personId: string,
): string | null {
  const grant = sharesOf(workspace).teamGrants.find((candidate) =>
    includedTeamMembers(candidate).some((member) => member.id === personId),
  );
  return grant?.teamId ?? null;
}

export function orgIncludedPeople(workspace: PrototypeWorkspace): Person[] {
  const { isOrgVisible, orgExcludedIds } = sharesOf(workspace);
  if (!isOrgVisible) return [];
  return allPeople().filter((person) => !orgExcludedIds.includes(person.id));
}

export function sharedPersonIds(workspace: PrototypeWorkspace): string[] {
  return [
    ...directMemberIds(workspace),
    ...sharesOf(workspace).teamGrants.flatMap((grant) =>
      includedTeamMembers(grant).map((member) => member.id),
    ),
    ...orgIncludedPeople(workspace).map((person) => person.id),
  ];
}

export function directMemberIds(workspace: PrototypeWorkspace): string[] {
  return [workspace.ownerId, ...workspace.members.map((m) => m.personId)];
}

export function workspaceMemberIds(workspace: PrototypeWorkspace): string[] {
  return allPeople()
    .filter((person) => workspaceAccessOf(workspace, person) !== null)
    .map((person) => person.id);
}

export function workspacesOf(person: Person): PrototypeWorkspace[] {
  return allWorkspaces().filter(
    (workspace) => workspaceAccessOf(workspace, person) !== null,
  );
}

export function workspaceOwnKnowledge(
  workspace: PrototypeWorkspace,
  created: Partial<Record<string, WorkspaceKnowledge[]>>,
): WorkspaceKnowledge[] {
  return [
    ...workspace.knowledgeBases.map((name) => ({ id: name, name })),
    ...(created[workspace.id] ?? []),
  ];
}

export function linkedKnowledgeOf(
  workspaceId: string,
  linked: Partial<Record<string, LinkedKnowledge[]>>,
  items: PrototypeKnowledge[],
): { link: LinkedKnowledge; knowledge: PrototypeKnowledge }[] {
  return (linked[workspaceId] ?? []).flatMap((link) => {
    const knowledge = items.find((item) => item.id === link.knowledgeId);
    return knowledge ? [{ link, knowledge }] : [];
  });
}

export function workspaceOwnSkills(
  skills: PrototypeSkill[],
  workspaceId: string,
): PrototypeSkill[] {
  return skills.filter(
    (skill) =>
      skill.owner.kind === 'workspace' &&
      skill.owner.workspaceId === workspaceId,
  );
}

export function teamMemberCount(teamId: string): number {
  return findTeam(teamId).memberCount;
}

export function orgMemberCount(): number {
  return ORG.memberCount;
}

export function adminTeamIds(person: Person): string[] {
  return allTeams()
    .filter((team) => team.adminIds.includes(person.id))
    .map((team) => team.id);
}

function reviewAllKey(resource: ResourceKind): PermissionKey {
  return resource === 'skill'
    ? 'review_all_skill_requests'
    : 'review_all_knowledge_requests';
}

export function reviewableTeamIds(
  person: Person,
  role: Role,
  resource: ResourceKind,
): string[] {
  if (roleMay(role, reviewAllKey(resource)))
    return TEAMS.map((team) => team.id);
  return teamAdminMay('team_review_requests') ? adminTeamIds(person) : [];
}

export function managedTeams(person: Person, role: Role): Team[] {
  return role === 'orgAdmin'
    ? allTeams()
    : allTeams().filter((team) => team.adminIds.includes(person.id));
}

export function canReviewTarget(
  target: TransferTarget,
  person: Person,
  role: Role,
  resource: ResourceKind,
): boolean {
  if (target.kind === 'org') return roleMay(role, reviewAllKey(resource));
  return reviewableTeamIds(person, role, resource).includes(target.teamId);
}

export function transferTargetsOf(
  person: Person,
  includeOtherTeams = false,
): TransferTarget[] {
  const otherTeamIds = includeOtherTeams
    ? TEAMS.map((team) => team.id).filter(
        (teamId) => !person.teamIds.includes(teamId),
      )
    : [];
  return [
    ...[...person.teamIds, ...otherTeamIds].map((teamId): TransferTarget => ({
      kind: 'team',
      teamId,
    })),
    { kind: 'org' },
  ];
}

export function targetLabel(target: TransferTarget): string {
  return target.kind === 'org'
    ? 'die Organisation'
    : `Team ${findTeam(target.teamId).name}`;
}

export function targetOwnerLabel(target: TransferTarget): string {
  return target.kind === 'org'
    ? 'der Organisation'
    : `dem Team ${findTeam(target.teamId).name}`;
}

export function ownerLabel(item: OwnedItem): string {
  const { owner } = item;
  if (owner.kind === 'org') return 'Organisation';
  if (owner.kind === 'team') return `Team ${findTeam(owner.teamId).name}`;
  if (owner.kind === 'user') return findPerson(owner.userId).name;
  return findWorkspace(owner.workspaceId).name;
}
