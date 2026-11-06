import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { TeamAccessService } from 'src/iam/teams/application/services/team-access.service';
import { TeamRolePolicyService } from 'src/iam/teams/application/services/team-role-policy.service';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';
import {
  TeamMemberNotFoundError,
  UnexpectedTeamMemberError,
} from 'src/iam/teams/application/team-members.errors';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { UpdateTeamMemberRoleCommand } from './update-team-member-role.command';

@Injectable()
export class UpdateTeamMemberRoleUseCase {
  private readonly logger = new Logger(UpdateTeamMemberRoleUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly teamAccessService: TeamAccessService,
    private readonly teamRolePolicy: TeamRolePolicyService,
    private readonly context: ContextService,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedTeamMemberError)
  async execute(command: UpdateTeamMemberRoleCommand): Promise<TeamMember> {
    const principal = getRequiredUserContext(this.context);
    this.logger.log(
      { teamId: command.teamId, userId: command.userId, role: command.role },
      'Updating team member role',
    );

    const team = await this.teamsRepository.findById(command.teamId);
    if (team?.orgId !== principal.orgId) {
      throw new TeamNotFoundError(command.teamId);
    }
    const member = await this.teamMembersRepository.findByTeamIdAndUserId(
      command.teamId,
      command.userId,
    );
    if (!member) {
      throw new TeamMemberNotFoundError(command.teamId, command.userId);
    }

    const access = await this.teamAccessService.forTeam(
      principal,
      command.teamId,
    );
    await this.teamRolePolicy.assertMayChangeRole(access, member, command.role);

    if (member.role !== command.role) {
      await this.teamMembersRepository.updateRole(
        command.teamId,
        command.userId,
        command.role,
      );
      member.role = command.role;
    }
    return member;
  }
}
