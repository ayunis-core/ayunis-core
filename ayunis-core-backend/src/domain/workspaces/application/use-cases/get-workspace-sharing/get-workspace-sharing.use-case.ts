import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  WorkspaceSharingReadRepository,
  type WorkspaceSharingSnapshot,
} from 'src/domain/workspaces/application/ports/workspace-sharing-read-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
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
    await this.accessService.requireAccessLevel(
      query.workspaceId,
      WorkspaceAccessLevel.FULL,
    );
    const snapshot = await this.repository.findSharing(query.workspaceId);
    const [users, teams] = await Promise.all([
      this.findUsers(snapshot),
      this.listTeamsUseCase.execute(),
    ]);
    return this.toView(snapshot, users, teams);
  }

  private findUsers(snapshot: WorkspaceSharingSnapshot): Promise<User[]> {
    const ids = new Set(snapshot.members.map(({ userId }) => userId));
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
  ): WorkspaceSharingView {
    const usersById = new Map(users.map((user) => [user.id, user]));
    const teamsById = new Map(teams.map((team) => [team.team.id, team]));
    return {
      members: snapshot.members.flatMap((member) => {
        const user = usersById.get(member.userId);
        return user
          ? [{ user, accessLevel: member.accessLevel, status: member.status }]
          : [];
      }),
      teamGrants: snapshot.teamGrants.flatMap((grant) => {
        const team = teamsById.get(grant.teamId);
        if (!team) return [];
        return [
          {
            ...team,
            accessLevel: grant.accessLevel,
            overrides: grant.overrides.flatMap((override) => {
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
            }),
          },
        ];
      }),
    };
  }
}
