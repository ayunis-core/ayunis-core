import type { UUID } from 'crypto';
import {
  compareAccessLevels,
  highestGrant,
  type WorkspaceAccessLevel,
  type WorkspaceGrantLevel,
} from './workspace-access-level';

export type TeamOverride =
  { excluded: true } | { excluded: false; level: WorkspaceGrantLevel };

export interface TeamGrant {
  teamId: UUID;
  level: WorkspaceGrantLevel;
  grantedAt: Date;
  overrides: Map<UUID, TeamOverride>;
}

export interface TeamMembership {
  teamsOf(userId: UUID): UUID[];
  membersOf(teamId: UUID): UUID[];
}

export type MemberPlacement =
  | { type: 'owner' }
  | { type: 'team'; teamId: UUID }
  | { type: 'organization' }
  | { type: 'direct' };

function inGrantOrder(a: TeamGrant, b: TeamGrant): number {
  return (
    a.grantedAt.getTime() - b.grantedAt.getTime() ||
    a.teamId.localeCompare(b.teamId)
  );
}

export class WorkspaceSharing {
  readonly workspaceId: UUID;
  readonly ownerId: UUID;
  isSharedWithOrganization: boolean;
  readonly people: Map<UUID, WorkspaceGrantLevel>;
  teams: TeamGrant[];
  readonly organizationExclusions: Set<UUID>;

  constructor(params: {
    workspaceId: UUID;
    ownerId: UUID;
    isSharedWithOrganization?: boolean;
    people?: Map<UUID, WorkspaceGrantLevel>;
    teams?: TeamGrant[];
    organizationExclusions?: Set<UUID>;
  }) {
    this.workspaceId = params.workspaceId;
    this.ownerId = params.ownerId;
    this.isSharedWithOrganization = params.isSharedWithOrganization ?? false;
    this.people = params.people ?? new Map<UUID, WorkspaceGrantLevel>();
    this.teams = [...(params.teams ?? [])].sort(inGrantOrder);
    this.organizationExclusions =
      params.organizationExclusions ?? new Set<UUID>();
  }

  levelOf(userId: UUID, userTeamIds: UUID[]): WorkspaceAccessLevel | null {
    if (userId === this.ownerId) return 'owner';
    return highestGrant([
      this.people.get(userId),
      ...this.teams
        .filter(({ teamId }) => userTeamIds.includes(teamId))
        .map((grant) => this.teamLevelOf(grant, userId)),
      this.isIncludedInOrganization(userId) ? 'use' : null,
    ]);
  }

  placementOf(
    userId: UUID,
    membership: TeamMembership,
  ): MemberPlacement | null {
    if (userId === this.ownerId) return { type: 'owner' };
    const teamId = this.shownTeamOf(userId, membership);
    if (teamId) return { type: 'team', teamId };
    if (this.isIncludedInOrganization(userId)) return { type: 'organization' };
    return this.people.has(userId) ? { type: 'direct' } : null;
  }

  includedMembersOf(grant: TeamGrant, membership: TeamMembership): UUID[] {
    return membership
      .membersOf(grant.teamId)
      .filter((userId) => !grant.overrides.get(userId)?.excluded);
  }

  memberIds(
    membership: TeamMembership,
    organizationMemberIds: UUID[],
  ): Set<UUID> {
    const ids = new Set<UUID>([this.ownerId, ...this.people.keys()]);
    for (const grant of this.teams) {
      for (const userId of this.includedMembersOf(grant, membership)) {
        ids.add(userId);
      }
    }
    if (this.isSharedWithOrganization) {
      for (const userId of organizationMemberIds) {
        if (!this.organizationExclusions.has(userId)) ids.add(userId);
      }
    }
    return ids;
  }

  teamLevelFor(teamId: UUID, userId: UUID): WorkspaceGrantLevel | null {
    const grant = this.grantOf(teamId);
    return grant ? this.teamLevelOf(grant, userId) : null;
  }

  shownTeamOf(userId: UUID, membership: TeamMembership): UUID | undefined {
    let shown: { teamId: UUID; level: WorkspaceGrantLevel } | undefined;
    for (const grant of this.teams) {
      const level = this.teamLevelOf(grant, userId);
      if (!level || !membership.teamsOf(userId).includes(grant.teamId)) {
        continue;
      }
      if (!shown || compareAccessLevels(level, shown.level) < 0) {
        shown = { teamId: grant.teamId, level };
      }
    }
    return shown?.teamId;
  }

  isIncludedInOrganization(userId: UUID): boolean {
    return (
      this.isSharedWithOrganization && !this.organizationExclusions.has(userId)
    );
  }

  invite(
    invitation: {
      userIds: UUID[];
      teamIds: UUID[];
      level: WorkspaceGrantLevel;
      at: Date;
    },
    membership: TeamMembership,
  ): void {
    for (const userId of invitation.userIds) {
      if (this.levelOf(userId, membership.teamsOf(userId)) !== null) continue;
      this.people.set(userId, invitation.level);
      this.organizationExclusions.delete(userId);
    }
    const granted = new Set(this.teams.map(({ teamId }) => teamId));
    this.teams = [
      ...this.teams,
      ...invitation.teamIds
        .filter((teamId) => !granted.has(teamId))
        .map((teamId) => ({
          teamId,
          level: invitation.level,
          grantedAt: invitation.at,
          overrides: new Map<UUID, TeamOverride>(),
        })),
    ].sort(inGrantOrder);
    this.placePeopleInTeams(membership);
  }

  setLevel(
    userId: UUID,
    level: WorkspaceGrantLevel,
    placement: MemberPlacement,
    membership: TeamMembership,
  ): void {
    if (placement.type === 'team') {
      this.people.delete(userId);
      this.grantOf(placement.teamId)?.overrides.set(userId, {
        excluded: false,
        level,
      });
    } else if (placement.type === 'organization' && level === 'use') {
      this.people.delete(userId);
    } else if (placement.type !== 'owner') {
      this.people.set(userId, level);
    }
    this.placePeopleInTeams(membership);
  }

  remove(
    userId: UUID,
    placement: MemberPlacement,
    membership: TeamMembership,
  ): void {
    if (placement.type !== 'team') this.people.delete(userId);
    if (placement.type === 'team') {
      this.grantOf(placement.teamId)?.overrides.set(userId, { excluded: true });
      this.teams = this.teams.filter(
        (grant) =>
          grant.teamId !== placement.teamId ||
          this.includedMembersOf(grant, membership).length > 0,
      );
    }
    if (placement.type === 'organization') {
      this.organizationExclusions.add(userId);
    }
    this.placePeopleInTeams(membership);
  }

  endTeamGrant(teamId: UUID): void {
    this.teams = this.teams.filter((grant) => grant.teamId !== teamId);
  }

  levelWithoutTeam(
    teamId: UUID,
    userId: UUID,
    membership: TeamMembership,
  ): WorkspaceAccessLevel | null {
    return this.levelOf(
      userId,
      membership.teamsOf(userId).filter((id) => id !== teamId),
    );
  }

  setSharedWithOrganization(shared: boolean): void {
    this.isSharedWithOrganization = shared;
    this.organizationExclusions.clear();
  }

  private placePeopleInTeams(membership: TeamMembership): void {
    for (const [userId, level] of [...this.people]) {
      const teamId = this.shownTeamOf(userId, membership);
      const grant = teamId ? this.grantOf(teamId) : undefined;
      if (!grant) continue;
      grant.overrides.set(userId, {
        excluded: false,
        level: highestGrant([this.teamLevelOf(grant, userId), level]) ?? level,
      });
      this.people.delete(userId);
    }
    for (const grant of this.teams) {
      for (const [userId, override] of [...grant.overrides]) {
        if (!override.excluded && override.level === grant.level) {
          grant.overrides.delete(userId);
        }
      }
    }
  }

  private teamLevelOf(
    grant: TeamGrant,
    userId: UUID,
  ): WorkspaceGrantLevel | null {
    const override = grant.overrides.get(userId);
    if (override?.excluded) return null;
    return override?.level ?? grant.level;
  }

  private grantOf(teamId: UUID): TeamGrant | undefined {
    return this.teams.find((grant) => grant.teamId === teamId);
  }
}
