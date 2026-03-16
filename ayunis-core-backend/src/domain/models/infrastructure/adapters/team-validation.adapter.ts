import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { TeamValidationPort } from '../../application/ports/team-validation.port';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';

@Injectable()
export class TeamValidationAdapter extends TeamValidationPort {
  constructor(private readonly teamsRepository: TeamsRepository) {
    super();
  }

  async existsInOrg(teamId: UUID, orgId: UUID): Promise<boolean> {
    const team = await this.teamsRepository.findById(teamId);
    return team !== null && team.orgId === orgId;
  }
}
