import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../ports/teams.repository';
import { TeamMembersRepository } from '../../ports/team-members.repository';
import { UnexpectedTeamError } from '../../teams.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { TeamWithMemberCount } from './team-with-member-count.view';

@Injectable()
export class ListTeamsUseCase {
  private readonly logger = new Logger(ListTeamsUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<TeamWithMemberCount[]> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('listTeams', { orgId });

    try {
      const teams = await this.teamsRepository.findByOrgId(orgId);
      const counts = await this.teamMembersRepository.countByTeamIds(
        teams.map((team) => team.id),
      );

      this.logger.debug('Teams retrieved successfully', {
        orgId,
        count: teams.length,
      });

      return teams.map((team) => ({
        team,
        memberCount: counts.get(team.id) ?? 0,
      }));
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to retrieve teams', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId,
      });
      throw new UnexpectedTeamError(error);
    }
  }
}
