import { Injectable } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { ReadableCollectiveOwners } from 'src/iam/teams/application/models/collective-owner.model';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';

@Injectable()
export class ListReadableCollectiveOwnersUseCase {
  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(): Promise<ReadableCollectiveOwners> {
    const { userId, orgId } = getRequiredUserContext(this.context);
    const teams = await this.teamsRepository.findByUserId(userId);
    return {
      orgId,
      teamIds: teams
        .filter((team) => team.orgId === orgId)
        .map((team) => team.id),
    };
  }
}
