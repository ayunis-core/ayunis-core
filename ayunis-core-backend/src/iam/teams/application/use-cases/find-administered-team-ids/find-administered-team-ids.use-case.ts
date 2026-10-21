import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';

@Injectable()
export class FindAdministeredTeamIdsUseCase {
  constructor(
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(): Promise<UUID[]> {
    const { userId } = getRequiredUserContext(this.context);
    return this.teamMembersRepository.findAdminTeamIdsByUserId(userId);
  }
}
