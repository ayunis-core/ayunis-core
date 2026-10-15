import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import {
  getRequiredUserContext,
  type UserContext,
} from 'src/common/context/required-context';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { TeamAccessDeniedError } from 'src/iam/teams/application/team-members.errors';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export const ALL_TEAMS = 'all';

interface TeamAccessRequest {
  teamId: UUID;
  targetOrgId?: UUID;
}

@Injectable()
export class TeamAccessService {
  private readonly logger = new Logger(TeamAccessService.name);

  constructor(
    private readonly hasPermission: HasPermissionUseCase,
    private readonly teamMembers: TeamMembersRepository,
    private readonly context: ContextService,
  ) {}

  async manageableTeamIds(): Promise<typeof ALL_TEAMS | UUID[]> {
    const user = getRequiredUserContext(this.context);
    if (await this.holdsAny(user, this.viewPermissions())) return ALL_TEAMS;
    return this.teamMembers.findAdminTeamIdsByUserId(user.userId);
  }

  assertCanView(request: TeamAccessRequest): Promise<void> {
    return this.assert(request, this.viewPermissions(), 'view');
  }

  assertCanManageMembers(request: TeamAccessRequest): Promise<void> {
    return this.assert(
      request,
      [Permission.ASSIGN_USERS_TO_TEAMS],
      'manage members',
    );
  }

  assertCanAppointAdmins(request: TeamAccessRequest): Promise<void> {
    return this.assert(request, [Permission.MANAGE_TEAMS], 'appoint admins');
  }

  mayChangeLastTeamAdmin(targetOrgId?: UUID): boolean {
    if (targetOrgId) return true;
    return getRequiredUserContext(this.context).role === UserRole.ADMIN;
  }

  private viewPermissions(): Permission[] {
    return [Permission.MANAGE_TEAMS, Permission.ASSIGN_USERS_TO_TEAMS];
  }

  private async assert(
    { teamId, targetOrgId }: TeamAccessRequest,
    permissions: Permission[],
    action: string,
  ): Promise<void> {
    if (targetOrgId) return;
    const user = getRequiredUserContext(this.context);
    if (await this.holdsAny(user, permissions)) return;
    const member = await this.teamMembers.findByTeamIdAndUserId(
      teamId,
      user.userId,
    );
    if (member?.isTeamAdmin) return;
    this.logger.warn(
      { userId: user.userId, orgId: user.orgId, teamId, action },
      'Access denied: not allowed to manage team',
    );
    throw new TeamAccessDeniedError(teamId);
  }

  private async holdsAny(
    user: UserContext,
    permissions: Permission[],
  ): Promise<boolean> {
    for (const permission of permissions) {
      const granted = await this.hasPermission.execute(
        new HasPermissionQuery(user.orgId, user.role, permission),
      );
      if (granted) return true;
    }
    return false;
  }
}
