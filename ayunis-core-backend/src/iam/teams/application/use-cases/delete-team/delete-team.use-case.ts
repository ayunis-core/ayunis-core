import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { DeleteTeamCommand } from './delete-team.command';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { Transactional } from '@nestjs-cls/transactional';
import { getRequiredOrgId } from 'src/common/context/required-context';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { TeamMembershipEndedEvent } from 'src/iam/teams/application/events/team-membership-ended.event';

@Injectable()
export class DeleteTeamUseCase {
  private readonly logger = new Logger(DeleteTeamUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly contextService: ContextService,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly events: EventEmitter2,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(command: DeleteTeamCommand): Promise<void> {
    const orgId = getRequiredOrgId(this.contextService, command.orgId);

    this.logger.log({ teamId: command.teamId, orgId }, 'execute');

    const team = await this.teamsRepository.findById(command.teamId);
    if (!team) {
      this.logger.error({ teamId: command.teamId }, 'Team not found');
      throw new TeamNotFoundError(command.teamId);
    }

    if (team.orgId !== orgId) {
      this.logger.error(
        {
          teamId: command.teamId,
          teamOrgId: team.orgId,
          requestOrgId: orgId,
        },
        'Team does not belong to organization',
      );
      throw new TeamNotFoundError(command.teamId);
    }

    // Note: Threads that used shared agents from this team will show a
    // "conversation no longer accessible" disclaimer when the user tries
    // to continue the chat. The history is preserved.

    const memberIds = await this.teamMembersRepository.findAllUserIdsByTeamId(
      command.teamId,
    );
    await this.teamsRepository.delete(command.teamId);
    await this.events.emitAsync(
      TeamMembershipEndedEvent.EVENT_NAME,
      new TeamMembershipEndedEvent(orgId, command.teamId, memberIds),
    );

    this.logger.debug({ teamId: command.teamId }, 'Team deleted successfully');
  }
}
