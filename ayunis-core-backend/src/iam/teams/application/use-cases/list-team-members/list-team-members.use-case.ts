import { Injectable, Logger } from '@nestjs/common';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { ListTeamMembersQuery } from './list-team-members.query';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { GetTeamQuery } from 'src/iam/teams/application/use-cases/get-team/get-team.query';
import { Paginated } from 'src/common/pagination';

@Injectable()
export class ListTeamMembersUseCase {
  private readonly logger = new Logger(ListTeamMembersUseCase.name);

  constructor(
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly getTeamUseCase: GetTeamUseCase,
  ) {}

  async execute(query: ListTeamMembersQuery): Promise<Paginated<TeamMember>> {
    this.logger.log({ teamId: query.teamId }, 'execute');

    try {
      await this.getTeamUseCase.execute(new GetTeamQuery(query.teamId));
      const members = await this.teamMembersRepository.findByTeamId(
        query.teamId,
        { limit: query.limit, offset: query.offset },
      );

      this.logger.debug(
        {
          teamId: query.teamId,
          count: members.data.length,
          total: members.total,
        },
        'Team members retrieved successfully',
      );

      return members;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          teamId: query.teamId,
        },
        'Failed to retrieve team members',
      );
      throw new UnexpectedTeamError(error);
    }
  }
}
