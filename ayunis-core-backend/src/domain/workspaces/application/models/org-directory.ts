import type { UUID } from 'crypto';
import type { TeamMembership } from 'src/domain/workspaces/domain/workspace-sharing';

export interface DirectoryTeamRef {
  id: UUID;
  name: string;
}

export interface DirectoryPerson {
  id: UUID;
  name: string;
  teams: DirectoryTeamRef[];
}

export interface DirectoryTeam extends DirectoryTeamRef {
  memberIds: UUID[];
}

export class OrgDirectory implements TeamMembership {
  private readonly peopleById: Map<UUID, DirectoryPerson>;
  private readonly teamsById: Map<UUID, DirectoryTeam>;

  constructor(people: DirectoryPerson[], teams: DirectoryTeamRef[]) {
    this.peopleById = new Map(people.map((person) => [person.id, person]));
    this.teamsById = new Map(
      teams.map((team) => [
        team.id,
        {
          ...team,
          memberIds: people
            .filter((person) => person.teams.some(({ id }) => id === team.id))
            .map(({ id }) => id),
        },
      ]),
    );
  }

  get people(): DirectoryPerson[] {
    return [...this.peopleById.values()];
  }

  get teams(): DirectoryTeam[] {
    return [...this.teamsById.values()];
  }

  person(userId: UUID): DirectoryPerson | undefined {
    return this.peopleById.get(userId);
  }

  team(teamId: UUID): DirectoryTeam | undefined {
    return this.teamsById.get(teamId);
  }

  teamsOf(userId: UUID): UUID[] {
    return (this.peopleById.get(userId)?.teams ?? []).map(({ id }) => id);
  }

  membersOf(teamId: UUID): UUID[] {
    return this.teamsById.get(teamId)?.memberIds ?? [];
  }

  affiliationOf(userId: UUID): string | null {
    return this.peopleById.get(userId)?.teams.at(0)?.name ?? null;
  }
}
