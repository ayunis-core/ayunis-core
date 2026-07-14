import type { UUID } from 'crypto';
import type { Logger } from '@nestjs/common';
import type { TeamsRepository } from '../ports/teams.repository';
import type { Team } from '../../domain/team.entity';
import { TeamNotFoundError } from '../teams.errors';

export async function findTeamInOrganization(
  teamsRepository: TeamsRepository,
  teamId: UUID,
  orgId: UUID,
  logger: Logger,
): Promise<Team> {
  const team = await teamsRepository.findById(teamId);

  if (!team) {
    logger.error('Team not found', { teamId });
    throw new TeamNotFoundError(teamId);
  }

  if (team.orgId !== orgId) {
    logger.error('Team does not belong to organization', {
      teamId,
      teamOrgId: team.orgId,
      requestOrgId: orgId,
    });
    throw new TeamNotFoundError(teamId);
  }

  return team;
}
