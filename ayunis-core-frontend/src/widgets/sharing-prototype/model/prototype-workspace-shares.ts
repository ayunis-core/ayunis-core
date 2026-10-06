import {
  findPerson,
  findWorkspace,
  includedTeamMembers,
  sharesOf,
  workspaceAccessOf,
} from './access';
import { selectKnowledge } from './prototype-knowledge';
import {
  patchState,
  readState,
  selectSkills,
  setWorkspaceDetails,
  setWorkspaceShares,
} from './prototype-store';
import type {
  MemberAccess,
  OwnedItem,
  TeamMemberOverride,
  WorkspaceShares,
  WorkspaceTeamGrant,
} from './types';

function withoutRedundantOverrides(
  grant: WorkspaceTeamGrant,
): WorkspaceTeamGrant {
  const overrides = Object.fromEntries(
    Object.entries(grant.overrides ?? {}).filter(
      ([, override]) => override !== grant.access,
    ),
  );
  return { ...grant, overrides };
}

function placeMembersInTeams(shares: WorkspaceShares): WorkspaceShares {
  const teamGrants = shares.teamGrants.map((grant) => ({
    ...grant,
    overrides: { ...grant.overrides },
  }));
  const members = shares.members.filter((member) => {
    const { teamIds } = findPerson(member.personId);
    const grant = teamGrants.find((candidate) =>
      teamIds.includes(candidate.teamId),
    );
    if (!grant) return true;
    grant.overrides[member.personId] = member.access;
    return false;
  });
  return {
    ...shares,
    members,
    teamGrants: teamGrants.map(withoutRedundantOverrides),
  };
}

function ownerLeft(workspaceId: string, item: OwnedItem | undefined): boolean {
  if (item?.owner.kind !== 'user') return false;
  const owner = findPerson(item.owner.userId);
  return workspaceAccessOf(findWorkspace(workspaceId), owner) === null;
}

function unlinkItemsOfLeavers(workspaceId: string): number {
  const current = readState();
  const skills = selectSkills(current);
  const knowledge = selectKnowledge(current);
  const linkedSkills = current.linkedSkills[workspaceId] ?? [];
  const linkedKnowledge = current.linkedKnowledge[workspaceId] ?? [];
  const keptSkills = linkedSkills.filter(
    (link) =>
      !ownerLeft(
        workspaceId,
        skills.find((skill) => skill.id === link.skillId),
      ),
  );
  const keptKnowledge = linkedKnowledge.filter(
    (link) =>
      !ownerLeft(
        workspaceId,
        knowledge.find((item) => item.id === link.knowledgeId),
      ),
  );
  const removed =
    linkedSkills.length -
    keptSkills.length +
    linkedKnowledge.length -
    keptKnowledge.length;
  if (removed > 0) {
    patchState({
      linkedSkills: { ...current.linkedSkills, [workspaceId]: keptSkills },
      linkedKnowledge: {
        ...current.linkedKnowledge,
        [workspaceId]: keptKnowledge,
      },
    });
  }
  return removed;
}

function updateShares(
  workspaceId: string,
  change: (shares: WorkspaceShares) => WorkspaceShares,
): number {
  const next = change(sharesOf(findWorkspace(workspaceId)));
  setWorkspaceShares(workspaceId, placeMembersInTeams(next));
  return unlinkItemsOfLeavers(workspaceId);
}

export function addWorkspaceShares(
  workspaceId: string,
  added: { personIds: string[]; teamIds: string[]; access: MemberAccess },
) {
  updateShares(workspaceId, (shares) => ({
    ...shares,
    members: [
      ...shares.members.filter(
        (member) => !added.personIds.includes(member.personId),
      ),
      ...added.personIds.map((personId) => ({
        personId,
        access: added.access,
      })),
    ],
    teamGrants: [
      ...shares.teamGrants.filter(
        (grant) => !added.teamIds.includes(grant.teamId),
      ),
      ...added.teamIds.map((teamId) => ({ teamId, access: added.access })),
    ],
    orgExcludedIds: shares.orgExcludedIds.filter(
      (personId) => !added.personIds.includes(personId),
    ),
  }));
}

export function setMemberAccess(
  workspaceId: string,
  personId: string,
  access: MemberAccess,
) {
  updateShares(workspaceId, (shares) => ({
    ...shares,
    members: shares.members.map((member) =>
      member.personId === personId ? { ...member, access } : member,
    ),
  }));
}

export function removeWorkspaceMember(
  workspaceId: string,
  personId: string,
): number {
  return updateShares(workspaceId, (shares) => ({
    ...shares,
    members: shares.members.filter((member) => member.personId !== personId),
  }));
}

export function setTeamMemberOverride(
  workspaceId: string,
  teamId: string,
  personId: string,
  override: TeamMemberOverride,
) {
  updateShares(workspaceId, (shares) => ({
    ...shares,
    teamGrants: shares.teamGrants.map((grant) =>
      grant.teamId === teamId
        ? { ...grant, overrides: { ...grant.overrides, [personId]: override } }
        : grant,
    ),
  }));
}

export function transferWorkspaceOwnership(
  workspaceId: string,
  newOwnerId: string,
) {
  const previousOwnerId = findWorkspace(workspaceId).ownerId;
  setWorkspaceDetails(workspaceId, { ownerId: newOwnerId });
  updateShares(workspaceId, (shares) => ({
    ...shares,
    members: [
      ...shares.members.filter(
        (member) =>
          member.personId !== newOwnerId && member.personId !== previousOwnerId,
      ),
      { personId: previousOwnerId, access: 'manage' },
    ],
  }));
}

export function setOrgVisible(
  workspaceId: string,
  isOrgVisible: boolean,
): number {
  return updateShares(workspaceId, (shares) => ({
    ...shares,
    isOrgVisible,
    orgExcludedIds: [],
  }));
}

export function setOrgMemberAccess(
  workspaceId: string,
  personId: string,
  access: MemberAccess,
) {
  updateShares(workspaceId, (shares) => {
    const others = shares.members.filter(
      (member) => member.personId !== personId,
    );
    return {
      ...shares,
      members: access === 'use' ? others : [...others, { personId, access }],
    };
  });
}

export function excludeOrgMember(
  workspaceId: string,
  personId: string,
): number {
  return updateShares(workspaceId, (shares) => ({
    ...shares,
    members: shares.members.filter((member) => member.personId !== personId),
    orgExcludedIds: [...shares.orgExcludedIds, personId],
  }));
}

export function excludeTeamMember(
  workspaceId: string,
  teamId: string,
  personId: string,
): number {
  return updateShares(workspaceId, (shares) => ({
    ...shares,
    teamGrants: shares.teamGrants
      .map((grant) =>
        grant.teamId === teamId
          ? {
              ...grant,
              overrides: {
                ...grant.overrides,
                [personId]: 'excluded' as const,
              },
            }
          : grant,
      )
      .filter((grant) => includedTeamMembers(grant).length > 0),
  }));
}
