import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
import { TeamAccessService } from 'src/iam/teams/application/services/team-access.service';
import type { TeamWithAccess } from './team-with-access.view';

@Injectable()
export class ListMyTeamAccessUseCase {
  private readonly logger = new Logger(ListMyTeamAccessUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamAccessService: TeamAccessService,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(): Promise<TeamWithAccess[]> {
    const principal = getRequiredUserContext(this.context);
    this.logger.log({ userId: principal.userId }, 'Listing my teams');

    const [teams, { byTeamId }] = await Promise.all([
      this.teamsRepository.findByUserId(principal.userId),
      this.teamAccessService.forMemberships(principal),
    ]);
    return teams.flatMap((team) => {
      const access = byTeamId.get(team.id);
      return access ? [{ team, access }] : [];
    });
  }
}
