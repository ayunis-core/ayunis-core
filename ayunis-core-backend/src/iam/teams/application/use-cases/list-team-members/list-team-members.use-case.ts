import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { ListTeamMembersQuery } from './list-team-members.query';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
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

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(query: ListTeamMembersQuery): Promise<Paginated<TeamMember>> {
    this.logger.log({ teamId: query.teamId }, 'execute');

    await this.getTeamUseCase.execute(
      new GetTeamQuery(query.teamId, query.orgId),
    );
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
  }
}
