import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredOrgId } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedTeamMemberError } from 'src/iam/teams/application/team-members.errors';
import { TeamMemberCreationService } from 'src/iam/teams/application/services/team-member-creation.service';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { AddTeamMemberCommand } from './add-team-member.command';

@Injectable()
export class AddTeamMemberUseCase {
  private readonly logger = new Logger(AddTeamMemberUseCase.name);
  constructor(
    private readonly createMember: TeamMemberCreationService,
    private readonly context: ContextService,
  ) {}
  @HandleUnexpectedErrors(UnexpectedTeamMemberError)
  async execute(command: AddTeamMemberCommand): Promise<TeamMember> {
    const orgId = getRequiredOrgId(this.context, command.orgId);
    this.logger.log(
      { orgId, teamId: command.teamId, userId: command.userId },
      'Adding team member',
    );
    return this.createMember.add(command, orgId);
  }
}
