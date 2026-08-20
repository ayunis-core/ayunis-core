import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  WorkspaceSharingReadRepository,
  type WorkspaceSharingSnapshot,
} from 'src/domain/workspaces/application/ports/workspace-sharing-read-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { ListTeamsUseCase } from 'src/iam/teams/application/use-cases/list-teams/list-teams.use-case';
import type { TeamWithMemberCount } from 'src/iam/teams/application/use-cases/list-teams/team-with-member-count.view';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import type { User } from 'src/iam/users/domain/user.entity';
import { GetWorkspaceSharingQuery } from './get-workspace-sharing.query';
import type { WorkspaceSharingView } from './workspace-sharing.view';

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
    const { workspace } = await this.accessService.requireRole(
      query.workspaceId,
      WorkspaceRole.FULL,
    );
    const snapshot = await this.repository.findSharing(query.workspaceId);
    const [users, teams] = await Promise.all([
      this.findUsers(snapshot, workspace.userId),
      this.listTeamsUseCase.execute(),
    ]);
    return {
      visibility: workspace.visibility,
      ...this.toView(snapshot, users, teams, workspace.userId),
    };
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

  private toView(
    snapshot: WorkspaceSharingSnapshot,
    users: User[],
    teams: TeamWithMemberCount[],
    ownerId: UUID,
  ): Omit<WorkspaceSharingView, 'visibility'> {
    const usersById = new Map(users.map((user) => [user.id, user]));
    const owner = usersById.get(ownerId);
    if (!owner) throw new Error('Workspace owner was not hydrated');
    const teamsById = new Map(teams.map((team) => [team.team.id, team]));
    const grantedTeamIds = new Set(
      snapshot.teamGrants.map(({ teamId }) => teamId),
    );
    return {
      owner,
      availableTeams: teams.filter(({ team }) => !grantedTeamIds.has(team.id)),
      members: snapshot.members.flatMap((member) => {
        const user = usersById.get(member.userId);
        return user ? [{ user, role: member.role, status: member.status }] : [];
      }),
      teamGrants: snapshot.teamGrants.flatMap((grant) => {
        const team = teamsById.get(grant.teamId);
        if (!team) return [];
        return [
          {
            ...team,
            role: grant.role,
            overrides: grant.overrides.flatMap((override) => {
              const user = usersById.get(override.userId);
              return user
                ? [{ user, role: override.role, excluded: override.excluded }]
                : [];
            }),
          },
        ];
      }),
    };
  }
}
