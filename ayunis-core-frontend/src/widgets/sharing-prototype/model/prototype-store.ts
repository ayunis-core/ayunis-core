import { useSyncExternalStore } from 'react';
import { SKILLS } from './fixtures';
import { INITIAL_LINKED_KNOWLEDGE } from './knowledge-fixtures';
import {
  DEFAULT_PERMISSIONS,
  DEFAULT_TEAM_ADMIN_PERMISSIONS,
  orgRoleOf,
  type EditableOrgRole,
  type PermissionKey,
  type TeamAdminPermissionKey,
} from './permissions';
import { withDetails } from './skill-details';
import type {
  LinkedKnowledge,
  LinkedSkill,
  OwnedItem,
  PrototypeKnowledge,
  PrototypeSkill,
  ResourceKind,
  Role,
  TransferRequest,
  TransferTarget,
  WorkspaceDetails,
  WorkspaceKnowledge,
  WorkspaceShares,
} from './types';
import { FAVORITE_WORKSPACE_ID, WORKSPACES } from './workspace-fixtures';

export interface PrototypeState {
  role: Role;
  step: number;
  inactiveSkillIds: string[];
  linkedSkills: Partial<Record<string, LinkedSkill[]>>;
  linkedKnowledge: Partial<Record<string, LinkedKnowledge[]>>;
  createdKnowledge: Partial<Record<string, WorkspaceKnowledge[]>>;
  createdSkills: PrototypeSkill[];
  requests: TransferRequest[];
  transfers: Partial<Record<string, TransferTarget>>;
  permissions: Record<EditableOrgRole, PermissionKey[]>;
  deletedSkillIds: string[];
  createdKnowledgeItems: PrototypeKnowledge[];
  deletedKnowledgeIds: string[];
  teamAdminIds: Partial<Record<string, string[]>>;
  removedMembers: Partial<Record<string, string[]>>;
  workspaceShares: Partial<Record<string, WorkspaceShares>>;
  workspaceDetails: Partial<Record<string, Partial<WorkspaceDetails>>>;
  deletedWorkspaceIds: string[];
  favoriteWorkspaceIds: Partial<Record<string, string[]>>;
  teamAdminPermissions: TeamAdminPermissionKey[];
  mandatorySkillIds: string[];
}

const STORAGE_KEY = 'ayunis-sharing-prototype-v17';

function initialState(): PrototypeState {
  return {
    role: 'member',
    step: 0,
    inactiveSkillIds: ['bebauungsplan', 'terminanfragen'],
    linkedSkills: Object.fromEntries(
      WORKSPACES.map((workspace) => [workspace.id, workspace.linkedSkills]),
    ),
    linkedKnowledge: INITIAL_LINKED_KNOWLEDGE,
    createdKnowledge: {},
    createdSkills: [],
    requests: [
      {
        resource: 'skill',
        itemId: 'mail-antworten',
        target: { kind: 'team', teamId: 'bauamt' },
        requestedBy: 'lena',
        requestedAt: 'Heute, 09:14',
      },
      {
        resource: 'skill',
        itemId: 'tabellen',
        target: { kind: 'team', teamId: 'kaemmerei' },
        requestedBy: 'tobias',
        requestedAt: 'Gestern, 16:30',
      },
      {
        resource: 'skill',
        itemId: 'baustelleninfo',
        target: { kind: 'org' },
        requestedBy: 'jonas',
        requestedAt: '07.10.2026',
      },
      {
        resource: 'skill',
        itemId: 'abnahmeprotokoll',
        target: { kind: 'team', teamId: 'bauamt' },
        requestedBy: 'markus',
        requestedAt: 'Heute, 11:02',
      },
      {
        resource: 'skill',
        itemId: 'meldebescheinigung',
        target: { kind: 'team', teamId: 'buergerservice' },
        requestedBy: 'nina',
        requestedAt: 'Gestern, 10:05',
      },
      {
        resource: 'knowledge',
        itemId: 'kassenpruefung',
        target: { kind: 'team', teamId: 'kaemmerei' },
        requestedBy: 'tobias',
        requestedAt: '06.10.2026',
      },
    ],
    transfers: {},
    permissions: DEFAULT_PERMISSIONS,
    deletedSkillIds: [],
    createdKnowledgeItems: [],
    deletedKnowledgeIds: [],
    teamAdminIds: {},
    removedMembers: {},
    workspaceShares: {},
    workspaceDetails: {},
    deletedWorkspaceIds: [],
    favoriteWorkspaceIds: {},
    teamAdminPermissions: DEFAULT_TEAM_ADMIN_PERMISSIONS,
    mandatorySkillIds: ['datenschutz'],
  };
}

const ROLES: Role[] = ['orgAdmin', 'teamAdmin', 'member', 'workspaceOwner'];

function load(): PrototypeState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const stored = {
      ...initialState(),
      ...(JSON.parse(raw) as PrototypeState),
    };
    return ROLES.includes(stored.role) ? stored : initialState();
  } catch {
    return initialState();
  }
}

let state = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
}

function update(patch: Partial<PrototypeState>) {
  state = { ...state, ...patch };
  persist();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePrototypeState(): PrototypeState {
  return useSyncExternalStore(subscribe, () => state);
}

export function readState(): PrototypeState {
  return state;
}

export function patchState(patch: Partial<PrototypeState>) {
  update(patch);
}

export function setPrototypeRole(role: Role) {
  update({ role });
}

export function setPrototypeStep(step: number, role: Role) {
  update({ step, role });
}

export function toggleSkillActive(skillId: string) {
  const isInactive = state.inactiveSkillIds.includes(skillId);
  update({
    inactiveSkillIds: isInactive
      ? state.inactiveSkillIds.filter((id) => id !== skillId)
      : [...state.inactiveSkillIds, skillId],
  });
}

export function toggleSkillMandatory(skillId: string) {
  const isMandatory = state.mandatorySkillIds.includes(skillId);
  update({
    mandatorySkillIds: isMandatory
      ? state.mandatorySkillIds.filter((id) => id !== skillId)
      : [...state.mandatorySkillIds, skillId],
  });
}

export function setWorkspaceSkillLinked(
  workspaceId: string,
  link: LinkedSkill,
  isLinked: boolean,
) {
  const current = state.linkedSkills[workspaceId] ?? [];
  const without = current.filter((item) => item.skillId !== link.skillId);
  update({
    linkedSkills: {
      ...state.linkedSkills,
      [workspaceId]: isLinked ? [...without, link] : without,
    },
  });
}

export function togglePermission(orgRole: EditableOrgRole, key: PermissionKey) {
  const current = state.permissions[orgRole];
  update({
    permissions: {
      ...state.permissions,
      [orgRole]: current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    },
  });
}

export function roleMay(role: Role, key: PermissionKey): boolean {
  const orgRole = orgRoleOf(role);
  if (orgRole === 'admin') return true;
  return state.permissions[orgRole].includes(key);
}

export function nonAdminsMay(key: PermissionKey): boolean {
  return (
    state.permissions.user.includes(key) ||
    state.permissions.manager.includes(key)
  );
}

export function useHasPermission(role: Role, key: PermissionKey): boolean {
  const { permissions } = usePrototypeState();
  const orgRole = orgRoleOf(role);
  if (orgRole === 'admin') return true;
  return permissions[orgRole].includes(key);
}

export function teamAdminMay(key: TeamAdminPermissionKey): boolean {
  return state.teamAdminPermissions.includes(key);
}

export function toggleTeamAdminPermission(key: TeamAdminPermissionKey) {
  const current = state.teamAdminPermissions;
  update({
    teamAdminPermissions: current.includes(key)
      ? current.filter((existing) => existing !== key)
      : [...current, key],
  });
}

export function teamAdminOverride(teamId: string): string[] | undefined {
  return state.teamAdminIds[teamId];
}

export function workspaceSharesOverride(
  workspaceId: string,
): WorkspaceShares | undefined {
  return state.workspaceShares[workspaceId];
}

export function setWorkspaceShares(
  workspaceId: string,
  shares: WorkspaceShares,
) {
  update({
    workspaceShares: { ...state.workspaceShares, [workspaceId]: shares },
  });
}

export function workspaceDetailsOverride(
  workspaceId: string,
): Partial<WorkspaceDetails> | undefined {
  return state.workspaceDetails[workspaceId];
}

export function setWorkspaceDetails(
  workspaceId: string,
  patch: Partial<WorkspaceDetails>,
) {
  update({
    workspaceDetails: {
      ...state.workspaceDetails,
      [workspaceId]: { ...state.workspaceDetails[workspaceId], ...patch },
    },
  });
}

export function deletedWorkspaceIds(): string[] {
  return state.deletedWorkspaceIds;
}

export function deleteWorkspace(workspaceId: string) {
  update({
    deletedWorkspaceIds: [...state.deletedWorkspaceIds, workspaceId],
  });
}

export function favoriteWorkspaceIdsOf(
  current: PrototypeState,
  personId: string,
): string[] {
  return current.favoriteWorkspaceIds[personId] ?? [FAVORITE_WORKSPACE_ID];
}

export function toggleFavoriteWorkspace(personId: string, workspaceId: string) {
  const current = favoriteWorkspaceIdsOf(state, personId);
  update({
    favoriteWorkspaceIds: {
      ...state.favoriteWorkspaceIds,
      [personId]: current.includes(workspaceId)
        ? current.filter((id) => id !== workspaceId)
        : [...current, workspaceId],
    },
  });
}

export function removedFromTeam(teamId: string): string[] {
  return state.removedMembers[teamId] ?? [];
}

export function removeTeamMember(
  teamId: string,
  currentAdminIds: string[],
  personId: string,
) {
  update({
    removedMembers: {
      ...state.removedMembers,
      [teamId]: [...removedFromTeam(teamId), personId],
    },
    teamAdminIds: {
      ...state.teamAdminIds,
      [teamId]: currentAdminIds.filter((id) => id !== personId),
    },
  });
}

export function setTeamAdmin(
  teamId: string,
  currentAdminIds: string[],
  personId: string,
  isAdmin: boolean,
) {
  const without = currentAdminIds.filter((id) => id !== personId);
  update({
    teamAdminIds: {
      ...state.teamAdminIds,
      [teamId]: isAdmin ? [...without, personId] : without,
    },
  });
}

export function deleteSkill(skillId: string) {
  update({
    deletedSkillIds: [...state.deletedSkillIds, skillId],
    requests: state.requests.filter(
      (item) => !(item.resource === 'skill' && item.itemId === skillId),
    ),
  });
}

export function addCreatedSkill(skill: PrototypeSkill) {
  update({
    createdSkills: [
      ...state.createdSkills.filter((item) => item.id !== skill.id),
      skill,
    ],
    deletedSkillIds: state.deletedSkillIds.filter((id) => id !== skill.id),
  });
}

export function transferKey(resource: ResourceKind, itemId: string): string {
  return `${resource}:${itemId}`;
}

export function applyTransfer<T extends OwnedItem>(
  item: T,
  resource: ResourceKind,
  current: PrototypeState,
): T {
  const target: TransferTarget | undefined =
    current.transfers[transferKey(resource, item.id)];
  if (!target || item.owner.kind !== 'user') return item;
  return { ...item, owner: target, submittedBy: item.owner.userId };
}

let cachedSource: PrototypeState | null = null;
let cachedSkills: PrototypeSkill[] = SKILLS;

export function selectSkills(current: PrototypeState): PrototypeSkill[] {
  if (cachedSource === current) return cachedSkills;
  cachedSource = current;
  cachedSkills = [...SKILLS, ...current.createdSkills]
    .filter((skill) => !current.deletedSkillIds.includes(skill.id))
    .map((skill) => applyTransfer(withDetails(skill), 'skill', current));
  return cachedSkills;
}

export function usePrototypeSkills(): PrototypeSkill[] {
  return selectSkills(usePrototypeState());
}

export function resetPrototype() {
  update(initialState());
}
