import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TeamMembersRepository } from '../../ports/team-members.repository';
import { ListTeamMembersQuery } from './list-team-members.query';
import { TeamMember } from '../../../domain/team-member.entity';
import { UnexpectedTeamError } from '../../teams.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { GetTeamUseCase } from '../get-team/get-team.use-case';
import { GetTeamQuery } from '../get-team/get-team.query';
import { Paginated } from 'src/common/pagination';

@Injectable()
export class ListTeamMembersUseCase {
  constructor(
    @InjectPinoLogger(ListTeamMembersUseCase.name)
    private readonly logger: PinoLogger,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly getTeamUseCase: GetTeamUseCase,
  ) {}

  async execute(query: ListTeamMembersQuery): Promise<Paginated<TeamMember>> {
    this.logger.info({ teamId: query.teamId }, 'execute');

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
