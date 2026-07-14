import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
import { Injectable, Logger } from '@nestjs/common';
import { TeamMembersRepository } from '../../ports/team-members.repository';
import { CheckUserTeamMembershipQuery } from './check-user-team-membership.query';

@Injectable()
export class CheckUserTeamMembershipUseCase {
  private readonly logger = new Logger(CheckUserTeamMembershipUseCase.name);

  constructor(private readonly teamMembersRepository: TeamMembersRepository) {}

  /**
   * Check if a user is a member of a specific team
   * @param query - Query containing userId and teamId
   * @returns true if the user is a member of the team, false otherwise
   */
  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(query: CheckUserTeamMembershipQuery): Promise<boolean> {
    this.logger.log('checkUserTeamMembership', {
      userId: query.userId,
      teamId: query.teamId,
    });

    const membership = await this.teamMembersRepository.findByTeamIdAndUserId(
      query.teamId,
      query.userId,
    );

    return membership !== null;
  }
}
