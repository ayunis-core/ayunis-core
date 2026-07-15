import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../ports/teams.repository';
import { TeamMembersRepository } from '../../ports/team-members.repository';
import { ListTeamMembersQuery } from './list-team-members.query';
import { TeamMember } from '../../../domain/team-member.entity';
import { UnexpectedTeamError } from '../../teams.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Paginated } from 'src/common/pagination';
import { findTeamInOrganization } from '../../utils/find-team-in-organization';

@Injectable()
export class ListTeamMembersUseCase {
  private readonly logger = new Logger(ListTeamMembersUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(query: ListTeamMembersQuery): Promise<Paginated<TeamMember>> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('execute', { teamId: query.teamId, orgId });

    await findTeamInOrganization(
      this.teamsRepository,
      query.teamId,
      orgId,
      this.logger,
    );

    const members = await this.teamMembersRepository.findByTeamId(
      query.teamId,
      { limit: query.limit, offset: query.offset },
    );

    this.logger.debug('Team members retrieved successfully', {
      teamId: query.teamId,
      count: members.data.length,
      total: members.total,
    });

    return members;
  }
}
