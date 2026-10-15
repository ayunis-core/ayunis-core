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
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';
import { GetTeamAdminPermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-team-admin-permissions/get-team-admin-permissions.use-case';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { TeamAccessDeniedError } from 'src/iam/teams/application/team-members.errors';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export const ALL_TEAMS = 'all';

interface TeamAccessRequest {
  teamId: UUID;
  targetOrgId?: UUID;
}

interface AccessRule {
  permissions: Permission[];
  teamAdminRight?: TeamAdminPermission;
  action: string;
}

@Injectable()
export class TeamAccessService {
  private readonly logger = new Logger(TeamAccessService.name);

  constructor(
    private readonly hasPermission: HasPermissionUseCase,
    private readonly teamMembers: TeamMembersRepository,
    private readonly getTeamAdminPermissions: GetTeamAdminPermissionsUseCase,
    private readonly context: ContextService,
  ) {}

  async manageableTeamIds(): Promise<typeof ALL_TEAMS | UUID[]> {
    const user = getRequiredUserContext(this.context);
    if (await this.holdsAny(user, this.viewPermissions())) return ALL_TEAMS;
    return this.teamMembers.findAdminTeamIdsByUserId(user.userId);
  }

  assertCanView(request: TeamAccessRequest): Promise<void> {
    return this.assert(request, {
      permissions: this.viewPermissions(),
      action: 'view',
    });
  }

  assertCanManageMembers(request: TeamAccessRequest): Promise<void> {
    return this.assert(request, {
      permissions: [Permission.ASSIGN_USERS_TO_TEAMS],
      teamAdminRight: TeamAdminPermission.TEAM_MANAGE_MEMBERS,
      action: 'manage members',
    });
  }

  assertCanAppointAdmins(request: TeamAccessRequest): Promise<void> {
    return this.assert(request, {
      permissions: [Permission.MANAGE_TEAMS],
      teamAdminRight: TeamAdminPermission.TEAM_APPOINT_ADMINS,
      action: 'appoint admins',
    });
  }

  async teamAdminHasRight(right: TeamAdminPermission): Promise<boolean> {
    const { orgId } = getRequiredUserContext(this.context);
    const granted = await this.getTeamAdminPermissions.execute(orgId);
    return granted.includes(right);
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
    rule: AccessRule,
  ): Promise<void> {
    if (targetOrgId) return;
    const user = getRequiredUserContext(this.context);
    if (await this.holdsAny(user, rule.permissions)) return;
    if (await this.isTeamAdminWithRight(teamId, user.userId, rule)) return;
    this.logger.warn(
      { userId: user.userId, orgId: user.orgId, teamId, action: rule.action },
      'Access denied: not allowed to manage team',
    );
    throw new TeamAccessDeniedError(teamId);
  }

  private async isTeamAdminWithRight(
    teamId: UUID,
    userId: UUID,
    rule: AccessRule,
  ): Promise<boolean> {
    const member = await this.teamMembers.findByTeamIdAndUserId(teamId, userId);
    if (!member?.isTeamAdmin) return false;
    if (!rule.teamAdminRight) return true;
    return this.teamAdminHasRight(rule.teamAdminRight);
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
