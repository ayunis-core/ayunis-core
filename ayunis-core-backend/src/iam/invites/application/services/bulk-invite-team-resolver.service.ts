import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { BulkInviteValidationError } from 'src/iam/invites/application/services/bulk-invite-validator.service';
import type { CreateBulkInvitesCommand } from 'src/iam/invites/application/use-cases/create-bulk-invites/create-bulk-invites.command';
import { FindTeamsByOrgIdQuery } from 'src/iam/teams/application/use-cases/find-teams-by-org-id/find-teams-by-org-id.query';
import { FindTeamsByOrgIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-org-id/find-teams-by-org-id.use-case';

export interface BulkInviteTeamResolution {
  teamIdsByInvite: UUID[][];
  errors: BulkInviteValidationError[];
}

@Injectable()
export class BulkInviteTeamResolverService {
  constructor(private readonly findTeams: FindTeamsByOrgIdUseCase) {}

  async resolve(
    command: CreateBulkInvitesCommand,
  ): Promise<BulkInviteTeamResolution> {
    const namesByInvite = command.invites.map((invite) =>
      uniqueNames(invite.teamNames),
    );
    if (namesByInvite.every((names) => names.length === 0)) {
      return { teamIdsByInvite: namesByInvite.map(() => []), errors: [] };
    }

    const teams = await this.findTeams.execute(
      new FindTeamsByOrgIdQuery(command.orgId),
    );
    const teamIdsByName = new Map(teams.map((team) => [team.name, team.id]));
    const errors: BulkInviteValidationError[] = [];
    const teamIdsByInvite = namesByInvite.map((names, index) => {
      const unknownNames = names.filter((name) => !teamIdsByName.has(name));
      if (unknownNames.length > 0) {
        errors.push(unknownTeamError(command, index, unknownNames));
      }
      return names.flatMap((name) => {
        const teamId = teamIdsByName.get(name);
        return teamId ? [teamId] : [];
      });
    });
    return { teamIdsByInvite, errors };
  }
}

function uniqueNames(names: string[] | undefined): string[] {
  return [...new Set((names ?? []).map((name) => name.trim()).filter(Boolean))];
}

function unknownTeamError(
  command: CreateBulkInvitesCommand,
  index: number,
  names: string[],
): BulkInviteValidationError {
  const label = names.length === 1 ? 'team' : 'teams';
  return {
    row: index + 1,
    email: command.invites[index].email,
    errorCode: 'TEAM_NOT_FOUND',
    message: `Unknown ${label}: ${names.join(', ')}`,
  };
}
