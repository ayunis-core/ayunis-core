import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../ports/teams.repository';
import { TeamMembersRepository } from '../../ports/team-members.repository';
import { ListTeamMembersQuery } from './list-team-members.query';
import { TeamMember } from '../../../domain/team-member.entity';
import {
  TeamNotFoundError,
  TeamRetrievalFailedError,
} from '../../teams.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Paginated } from 'src/common/pagination';

@Injectable()
export class ListTeamMembersUseCase {
  private readonly logger = new Logger(ListTeamMembersUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: ListTeamMembersQuery): Promise<Paginated<TeamMember>> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('execute', { teamId: query.teamId, orgId });

    try {
      const team = await this.teamsRepository.findById(query.teamId);

      if (!team) {
        this.logger.error('Team not found', { teamId: query.teamId });
        throw new TeamNotFoundError(query.teamId);
      }

      if (team.orgId !== orgId) {
        this.logger.error('Team does not belong to organization', {
          teamId: query.teamId,
          teamOrgId: team.orgId,
          requestOrgId: orgId,
        });
        throw new TeamNotFoundError(query.teamId);
      }

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
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to retrieve team members', {
        error: error instanceof Error ? error.message : 'Unknown error',
        teamId: query.teamId,
      });
      throw new TeamRetrievalFailedError('Failed to retrieve team members');
    }
  }
}
