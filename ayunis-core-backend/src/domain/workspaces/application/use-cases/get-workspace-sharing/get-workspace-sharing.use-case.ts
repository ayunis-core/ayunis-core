import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { WorkspaceMember } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import {
  WorkspaceSharingReadRepository,
  type WorkspaceSharingSnapshot,
  type WorkspaceTeamGrantSharing,
} from 'src/domain/workspaces/application/ports/workspace-sharing-read-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { ListTeamsUseCase } from 'src/iam/teams/application/use-cases/list-teams/list-teams.use-case';
import type { TeamWithMemberCount } from 'src/iam/teams/application/use-cases/list-teams/team-with-member-count.view';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import type { User } from 'src/iam/users/domain/user.entity';
import { GetWorkspaceSharingQuery } from './get-workspace-sharing.query';
import type {
  WorkspaceSharingMemberView,
  WorkspaceSharingOverrideView,
  WorkspaceSharingTeamGrantView,
  WorkspaceSharingView,
} from './workspace-sharing.view';

@Injectable()
export class GetWorkspaceSharingUseCase {
  constructor(
    @InjectPinoLogger(GetWorkspaceSharingUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: WorkspaceSharingReadRepository,
    private readonly accessService: WorkspaceAccessService,
    private readonly findUsersByIdsUseCase: FindUsersByIdsUseCase,
    private readonly listTeamsUseCase: ListTeamsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: GetWorkspaceSharingQuery,
  ): Promise<WorkspaceSharingView> {
    this.logger.info(
      { workspaceId: query.workspaceId },
      'Getting workspace sharing',
    );
    const { workspace } = await this.accessService.requireAccessLevel(
      query.workspaceId,
      WorkspaceAccessLevel.FULL,
    );
    const [snapshot, teams] = await Promise.all([
      this.repository.findSharing(query.workspaceId),
      this.listTeamsUseCase.execute(),
    ]);
    const users = await this.findUsers(snapshot, workspace.userId);
    return toWorkspaceSharingView({ workspace, snapshot, users, teams });
  }

  private findUsers(
    snapshot: WorkspaceSharingSnapshot,
    ownerId: UUID,
  ): Promise<User[]> {
    const ids = new Set([
      ownerId,
      ...snapshot.members.map(({ userId }) => userId),
    ]);
    for (const grant of snapshot.teamGrants) {
      grant.overrides.forEach(({ userId }) => ids.add(userId));
    }
    return this.findUsersByIdsUseCase.execute(
      new FindUsersByIdsQuery([...ids]),
    );
  }
}

interface WorkspaceSharingViewInput {
  workspace: Pick<Workspace, 'userId' | 'visibility'>;
  snapshot: WorkspaceSharingSnapshot;
  users: User[];
  teams: TeamWithMemberCount[];
}

function toWorkspaceSharingView({
  workspace,
  snapshot,
  users,
  teams,
}: WorkspaceSharingViewInput): WorkspaceSharingView {
  const usersById = new Map(users.map((user) => [user.id, user]));
  const owner = usersById.get(workspace.userId);
  if (!owner) throw new Error('Workspace owner was not hydrated');
  const grantedTeamIds = new Set(
    snapshot.teamGrants.map(({ teamId }) => teamId),
  );
  return {
    visibility: workspace.visibility,
    owner,
    availableTeams: teams.filter(({ team }) => !grantedTeamIds.has(team.id)),
    members: mapMembers(snapshot.members, usersById),
    teamGrants: mapTeamGrants(snapshot.teamGrants, teams, usersById),
  };
}

function mapMembers(
  members: WorkspaceMember[],
  usersById: Map<UUID, User>,
): WorkspaceSharingMemberView[] {
  return members.flatMap((member) => {
    const user = usersById.get(member.userId);
    return user
      ? [{ user, accessLevel: member.accessLevel, status: member.status }]
      : [];
  });
}

function mapTeamGrants(
  grants: WorkspaceTeamGrantSharing[],
  teams: TeamWithMemberCount[],
  usersById: Map<UUID, User>,
): WorkspaceSharingTeamGrantView[] {
  const teamsById = new Map(teams.map((team) => [team.team.id, team]));
  return grants.flatMap((grant) => {
    const team = teamsById.get(grant.teamId);
    if (!team) return [];
    return [
      {
        ...team,
        accessLevel: grant.accessLevel,
        overrides: grant.overrides.flatMap((override) =>
          mapOverride(override, usersById),
        ),
      },
    ];
  });
}

function mapOverride(
  override: WorkspaceTeamGrantSharing['overrides'][number],
  usersById: Map<UUID, User>,
): WorkspaceSharingOverrideView[] {
  const user = usersById.get(override.userId);
  return user
    ? [
        {
          user,
          accessLevel: override.accessLevel,
          excluded: override.excluded,
        },
      ]
    : [];
}
