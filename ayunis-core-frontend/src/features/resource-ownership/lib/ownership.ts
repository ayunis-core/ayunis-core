import type {
  AppPermission,
  Authorization,
  TeamAccess,
} from '@/features/permissions';
import type {
  OwnedResource,
  OwnedResourceKind,
  OwnerSelection,
} from '@/features/resource-ownership/model/types';

interface KindPermissions {
  manage: AppPermission;
  team: AppPermission;
  org: AppPermission;
}

const PERMISSIONS: Record<OwnedResourceKind, KindPermissions> = {
  skill: {
    manage: 'manage_skills',
    team: 'share_skills_with_teams',
    org: 'share_skills_with_org',
  },
  'knowledge-base': {
    manage: 'manage_knowledge_bases',
    team: 'share_knowledge_bases_with_teams',
    org: 'share_knowledge_bases_with_org',
  },
};

export function ownerKey(selection: OwnerSelection): string {
  return selection.ownerType === 'team'
    ? `team:${selection.teamId}`
    : selection.ownerType;
}

/** The current owner of a resource; workspace resources cannot move. */
export function ownerOf(resource: OwnedResource): OwnerSelection | null {
  switch (resource.ownerType) {
    case 'team':
      return resource.teamId
        ? { ownerType: 'team', teamId: resource.teamId }
        : null;
    case 'org':
      return { ownerType: 'org' };
    case 'personal':
      return { ownerType: 'personal' };
    case 'workspace':
      return null;
  }
}

/**
 * The owners a user may create for or move to. Mirrors the backend: the
 * organization takes the org share permission, a team membership plus the
 * team share permission as resolved for the user's role in that team.
 */
export function manageableOwners(
  kind: OwnedResourceKind,
  authorization: Pick<Authorization, 'can'>,
  teams: readonly Pick<TeamAccess, 'id' | 'permissions'>[],
): OwnerSelection[] {
  const permissions = PERMISSIONS[kind];
  return [
    { ownerType: 'personal' },
    ...(authorization.can(permissions.org)
      ? [{ ownerType: 'org' } as const]
      : []),
    ...teams
      .filter((team) => team.permissions.includes(permissions.team))
      .map((team) => ({ ownerType: 'team', teamId: team.id }) as const),
  ];
}

/** Whether the user may edit, delete, activate or move the resource. */
export function canManageResource(
  kind: OwnedResourceKind,
  resource: OwnedResource,
  authorization: Pick<Authorization, 'can'>,
  teams: readonly Pick<TeamAccess, 'id' | 'permissions'>[],
): boolean {
  const permissions = PERMISSIONS[kind];
  if (!authorization.can(permissions.manage)) return false;
  const owner = ownerOf(resource);
  if (!owner) return false;
  if (owner.ownerType === 'personal') return !resource.isShared;
  return manageableOwners(kind, authorization, teams).some(
    (candidate) => ownerKey(candidate) === ownerKey(owner),
  );
}

/**
 * Mirrors the backend: personal skills link personal knowledge bases, shared
 * ones included; every other skill only knowledge bases of the same owner.
 */
export function canLinkKnowledgeBase(
  skill: OwnedResource,
  knowledgeBase: OwnedResource,
): boolean {
  if (skill.ownerType === 'personal') {
    return knowledgeBase.ownerType === 'personal';
  }
  if (skill.ownerType === 'workspace') return false;
  const owner = ownerOf(skill);
  const knowledgeBaseOwner = ownerOf(knowledgeBase);
  return (
    owner !== null &&
    knowledgeBaseOwner !== null &&
    ownerKey(owner) === ownerKey(knowledgeBaseOwner)
  );
}
