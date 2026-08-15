import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TeamMembersRepository } from '../../ports/team-members.repository';
import { CheckUserTeamMembershipQuery } from './check-user-team-membership.query';

@Injectable()
export class CheckUserTeamMembershipUseCase {
  constructor(
    @InjectPinoLogger(CheckUserTeamMembershipUseCase.name)
    private readonly logger: PinoLogger,
    private readonly teamMembersRepository: TeamMembersRepository,
  ) {}

  /**
   * Check if a user is a member of a specific team
   * @param query - Query containing userId and teamId
   * @returns true if the user is a member of the team, false otherwise
   */
  async execute(query: CheckUserTeamMembershipQuery): Promise<boolean> {
    this.logger.info(
      {
        userId: query.userId,
        teamId: query.teamId,
      },
      'checkUserTeamMembership',
    );

    const membership = await this.teamMembersRepository.findByTeamIdAndUserId(
      query.teamId,
      query.userId,
    );

    return membership !== null;
  }
}
