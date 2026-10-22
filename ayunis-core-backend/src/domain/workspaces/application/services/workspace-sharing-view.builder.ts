import type { UUID } from 'crypto';
import type { OrgDirectory } from 'src/domain/workspaces/application/models/org-directory';
import type { WorkspaceSharingRights } from 'src/domain/workspaces/application/models/workspace-sharing-rights';
import type {
  ShareCandidates,
  SharingMember,
  SharingTeamSection,
  WorkspaceSharingView,
} from 'src/domain/workspaces/application/models/workspace-sharing-view';
import {
  compareAccessLevels,
  highestGrant,
  type WorkspaceAccessLevel,
} from 'src/domain/workspaces/domain/workspace-access-level';
import type { WorkspaceSharing } from 'src/domain/workspaces/domain/workspace-sharing';

export class WorkspaceSharingViewBuilder {
  constructor(
    private readonly sharing: WorkspaceSharing,
    private readonly directory: OrgDirectory,
    private readonly rights: WorkspaceSharingRights,
  ) {}

  view(): WorkspaceSharingView {
    const teams = this.teamSections();
    const shownInTeams = new Set(
      teams.flatMap(({ members }) => members.map(({ userId }) => userId)),
    );
    return {
      isSharedWithOrganization: this.sharing.isSharedWithOrganization,
      memberCount: this.memberIds().size,
      viewer: this.rights,
      owner: this.member(this.sharing.ownerId, 'owner'),
      people: this.directPeople(),
      teams,
      organization: this.organizationSection(shownInTeams),
    };
  }

  candidates(): ShareCandidates {
    const { sharing, directory, rights } = this;
    const organization =
      rights.canShareWithOrganization && !sharing.isSharedWithOrganization
        ? { memberCount: directory.people.length }
        : null;
    if (!rights.canInvite) return { organization, teams: [], people: [] };
    const granted = new Set(sharing.teams.map(({ teamId }) => teamId));
    return {
      organization,
      teams: sharing.isSharedWithOrganization
        ? []
        : directory.teams
            .filter(({ id }) => !granted.has(id) && rights.mayInviteTeam(id))
            .map(({ id, name, memberIds }) => ({
              teamId: id,
              name,
              memberCount: memberIds.length,
              memberIds,
            })),
      people: directory.people
        .filter(
          ({ id }) =>
            sharing.levelOf(id, directory.teamsOf(id)) === null &&
            rights.mayReach(id, directory),
        )
        .map(({ id, name, teams }) => ({
          userId: id,
          name,
          primaryTeam: teams.at(0) ?? null,
        })),
    };
  }

  memberIds(): Set<UUID> {
    return this.sharing.memberIds(
      this.directory,
      this.directory.people.map(({ id }) => id),
    );
  }

  private directPeople(): SharingMember[] {
    return [...this.sharing.people]
      .filter(
        ([userId]) =>
          this.sharing.placementOf(userId, this.directory)?.type === 'direct',
      )
      .map(([userId, level]) => this.member(userId, level))
      .sort(byName);
  }

  private teamSections(): SharingTeamSection[] {
    return this.sharing.teams.map((grant) => {
      const included = this.sharing.includedMembersOf(grant, this.directory);
      return {
        teamId: grant.teamId,
        name: this.directory.team(grant.teamId)?.name ?? '',
        accessLevel: grant.level,
        memberCount: included.length,
        members: included
          .filter((userId) => this.isPlacedIn(grant.teamId, userId))
          .map((userId) =>
            this.member(userId, this.teamLevelOf(grant, userId), grant.teamId),
          )
          .sort(byName),
        canEnd: this.rights.mayEndTeamGrant(
          grant.teamId,
          this.sharing,
          this.directory,
        ),
      };
    });
  }

  private isPlacedIn(teamId: UUID, userId: UUID): boolean {
    return this.sharing.shownTeamOf(userId, this.directory) === teamId;
  }

  private teamLevelOf(
    grant: WorkspaceSharing['teams'][number],
    userId: UUID,
  ): WorkspaceAccessLevel {
    if (userId === this.sharing.ownerId) return 'owner';
    return (
      highestGrant([
        this.sharing.teamLevelFor(grant.teamId, userId),
        this.sharing.people.get(userId),
      ]) ?? grant.level
    );
  }

  private organizationSection(
    shownInTeams: Set<UUID>,
  ): WorkspaceSharingView['organization'] {
    if (!this.sharing.isSharedWithOrganization) return null;
    const included = this.directory.people.filter(({ id }) =>
      this.sharing.isIncludedInOrganization(id),
    );
    return {
      memberCount: included.length,
      members: included
        .filter(({ id }) => !shownInTeams.has(id))
        .map(({ id }) => this.member(id, this.organizationLevelOf(id)))
        .sort(
          (a, b) =>
            compareAccessLevels(a.accessLevel, b.accessLevel) || byName(a, b),
        ),
    };
  }

  private organizationLevelOf(userId: UUID): WorkspaceAccessLevel {
    if (userId === this.sharing.ownerId) return 'owner';
    return this.sharing.people.get(userId) ?? 'use';
  }

  private member(
    userId: UUID,
    accessLevel: WorkspaceAccessLevel,
    teamId?: UUID,
  ): SharingMember {
    const isOwner = userId === this.sharing.ownerId;
    return {
      userId,
      name: this.directory.person(userId)?.name ?? '',
      affiliation: this.directory.affiliationOf(userId),
      accessLevel,
      isOwner,
      canChange:
        !isOwner &&
        userId !== this.rights.userId &&
        this.rights.mayChange(userId, this.directory, teamId),
    };
  }
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name);
}
