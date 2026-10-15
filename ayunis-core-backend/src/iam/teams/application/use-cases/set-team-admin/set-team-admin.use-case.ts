import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredOrgId } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { TeamAccessService } from 'src/iam/teams/application/services/team-access.service';
import { LastTeamAdminPolicy } from 'src/iam/teams/application/services/last-team-admin-policy.service';
import {
  TeamMemberNotFoundError,
  UnexpectedTeamMemberError,
} from 'src/iam/teams/application/team-members.errors';
import { AssertTeamManagementAllowedUseCase } from 'src/iam/teams/application/use-cases/assert-team-management-allowed/assert-team-management-allowed.use-case';
import { GetTeamQuery } from 'src/iam/teams/application/use-cases/get-team/get-team.query';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { SetTeamAdminCommand } from './set-team-admin.command';

@Injectable()
export class SetTeamAdminUseCase {
  private readonly logger = new Logger(SetTeamAdminUseCase.name);

  constructor(
    private readonly teamManagementAccess: AssertTeamManagementAllowedUseCase,
    private readonly teamAccess: TeamAccessService,
    private readonly lastTeamAdmin: LastTeamAdminPolicy,
    private readonly getTeam: GetTeamUseCase,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly context: ContextService,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedTeamMemberError)
  async execute(command: SetTeamAdminCommand): Promise<TeamMember> {
    const orgId = getRequiredOrgId(this.context, command.orgId);
    await this.teamManagementAccess.execute({ orgId });
    await this.teamAccess.assertCanAppointAdmins({
      teamId: command.teamId,
      targetOrgId: command.orgId,
    });
    await this.getTeam.execute(new GetTeamQuery(command.teamId, command.orgId));
    if (!command.isTeamAdmin) {
      await this.lastTeamAdmin.assertMayLoseAdmin(command);
    }

    const member = await this.findMember(command);
    if (member.isTeamAdmin === command.isTeamAdmin) return member;

    await this.teamMembersRepository.setTeamAdmin(
      command.teamId,
      command.userId,
      command.isTeamAdmin,
    );
    this.logger.log(
      {
        teamId: command.teamId,
        userId: command.userId,
        isTeamAdmin: command.isTeamAdmin,
      },
      'Team admin role changed',
    );
    member.isTeamAdmin = command.isTeamAdmin;
    return member;
  }

  private async findMember(command: SetTeamAdminCommand): Promise<TeamMember> {
    const member = await this.teamMembersRepository.findByTeamIdAndUserId(
      command.teamId,
      command.userId,
    );
    if (!member) {
      throw new TeamMemberNotFoundError(command.teamId, command.userId);
    }
    return member;
  }
}
