import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import {
  UnexpectedTeamMemberError,
  UserNotInSameOrgError,
} from 'src/iam/teams/application/team-members.errors';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { AssignUserToTeamsCommand } from './assign-user-to-teams.command';

@Injectable()
export class AssignUserToTeamsUseCase {
  private readonly logger = new Logger(AssignUserToTeamsUseCase.name);

  constructor(
    private readonly teams: TeamsRepository,
    private readonly members: TeamMembersRepository,
    private readonly findUser: FindUserByIdUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamMemberError)
  async execute(command: AssignUserToTeamsCommand): Promise<void> {
    const teamIds = [...new Set(command.teamIds)];
    this.logger.log(
      {
        userId: command.userId,
        orgId: command.orgId,
        teamCount: teamIds.length,
      },
      'Assigning user to teams',
    );
    if (teamIds.length === 0) return;

    await this.assertTeamsBelongToOrg(teamIds, command.orgId);
    await this.assertUserBelongsToOrg(command);
    await this.members.createMany(
      teamIds.map(
        (teamId) => new TeamMember({ teamId, userId: command.userId }),
      ),
    );
  }

  private async assertTeamsBelongToOrg(
    teamIds: UUID[],
    orgId: UUID,
  ): Promise<void> {
    const availableIds = new Set(
      (await this.teams.findByIdsAndOrgId(teamIds, orgId)).map(
        (team) => team.id,
      ),
    );
    const missingTeamId = teamIds.find((teamId) => !availableIds.has(teamId));
    if (missingTeamId) throw new TeamNotFoundError(missingTeamId);
  }

  private async assertUserBelongsToOrg(
    command: AssignUserToTeamsCommand,
  ): Promise<void> {
    const user = await this.findUser.execute(
      new FindUserByIdQuery(command.userId),
    );
    if (user.orgId !== command.orgId) {
      throw new UserNotInSameOrgError(command.userId);
    }
  }
}
