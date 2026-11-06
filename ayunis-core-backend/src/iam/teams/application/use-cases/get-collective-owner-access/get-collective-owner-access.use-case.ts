import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  getRequiredUserContext,
  type UserContext,
} from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import type { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import type {
  CollectiveOwner,
  CollectiveOwnerAccess,
  CollectiveOwnerPermissions,
} from 'src/iam/teams/application/models/collective-owner.model';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { TeamAccessService } from 'src/iam/teams/application/services/team-access.service';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
import { GetCollectiveOwnerAccessQuery } from './get-collective-owner-access.query';

/**
 * Team members read what their team owns and organization members read what
 * the organization owns. Managing it also takes the permission that would
 * allow sharing with that audience; for a team, as resolved for the user's
 * role in that team.
 */
@Injectable()
export class GetCollectiveOwnerAccessUseCase {
  constructor(
    private readonly teamAccessService: TeamAccessService,
    private readonly teamMembers: TeamMembersRepository,
    private readonly hasPermission: HasPermissionUseCase,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(
    query: GetCollectiveOwnerAccessQuery,
  ): Promise<CollectiveOwnerAccess> {
    const user = getRequiredUserContext(this.context);
    return query.owner.type === 'team'
      ? this.teamOwnerAccess(user, query.owner.teamId, query.permissions)
      : this.orgOwnerAccess(user, query.owner, query.permissions);
  }

  private async teamOwnerAccess(
    user: UserContext,
    teamId: UUID,
    permissions: CollectiveOwnerPermissions | undefined,
  ): Promise<CollectiveOwnerAccess> {
    // Membership alone must not reach across tenants, so the team's
    // organization is checked as well.
    const isMember = await this.teamMembers.isMemberInOrg(
      teamId,
      user.userId,
      user.orgId,
    );
    if (!isMember) return { canRead: false, canManage: false };
    if (!permissions) return { canRead: true, canManage: false };
    const access = await this.teamAccessService.forTeam(
      { userId: user.userId, orgId: user.orgId, role: user.role },
      teamId,
    );
    const canRead = access.teamRole !== null;
    const canManage =
      canRead &&
      access.canOrgWide(permissions.manage) &&
      access.can(permissions.team);
    return { canRead, canManage };
  }

  private async orgOwnerAccess(
    user: UserContext,
    owner: Extract<CollectiveOwner, { type: 'org' }>,
    permissions: CollectiveOwnerPermissions | undefined,
  ): Promise<CollectiveOwnerAccess> {
    if (owner.orgId !== user.orgId) return { canRead: false, canManage: false };
    if (!permissions) return { canRead: true, canManage: false };
    const held = await Promise.all(
      [permissions.manage, permissions.org].map((permission) =>
        this.holds(user, permission),
      ),
    );
    return { canRead: true, canManage: held.every(Boolean) };
  }

  private holds(user: UserContext, permission: Permission): Promise<boolean> {
    return this.hasPermission.execute(
      new HasPermissionQuery(user.orgId, user.role, permission),
    );
  }
}
