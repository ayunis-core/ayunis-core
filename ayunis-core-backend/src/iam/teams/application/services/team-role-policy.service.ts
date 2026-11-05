import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { TeamLastAdminError } from 'src/iam/teams/application/team-members.errors';
import type { TeamAccess } from 'src/iam/teams/application/models/team-access.model';
import type { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

/**
 * Who may change team roles or remove team admins. Organisation-wide member
 * managers may leave a team without admins (they can always repair it); those
 * acting through their team role may not, so a team cannot lock itself out.
 */
@Injectable()
export class TeamRolePolicyService {
  private readonly logger = new Logger(TeamRolePolicyService.name);

  constructor(private readonly teamMembersRepository: TeamMembersRepository) {}

  async assertMayChangeRole(
    access: TeamAccess,
    member: TeamMember,
    role: UserRole,
  ): Promise<void> {
    this.assertMayManageRoles(access, member);
    if (member.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
      await this.assertAnotherAdminRemains(access, member.teamId);
    }
  }

  async assertMayRemove(access: TeamAccess, member: TeamMember): Promise<void> {
    if (member.role !== UserRole.ADMIN) return;
    this.assertMayManageRoles(access, member);
    await this.assertAnotherAdminRemains(access, member.teamId);
  }

  private assertMayManageRoles(access: TeamAccess, member: TeamMember): void {
    if (access.canManageRoles) return;
    this.logger.warn(
      { teamId: member.teamId, userId: member.userId },
      'Team role management denied',
    );
    throw new UnauthorizedAccessError({ teamId: member.teamId });
  }

  private async assertAnotherAdminRemains(
    access: TeamAccess,
    teamId: UUID,
  ): Promise<void> {
    if (access.canOrgWide(Permission.ASSIGN_USERS_TO_TEAMS)) return;
    const adminCount = await this.teamMembersRepository.countByTeamIdAndRole(
      teamId,
      UserRole.ADMIN,
    );
    if (adminCount > 1) return;
    throw new TeamLastAdminError(teamId);
  }
}
