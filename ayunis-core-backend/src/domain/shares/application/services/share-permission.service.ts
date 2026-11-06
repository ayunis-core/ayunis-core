import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  getRequiredUserContext,
  type UserContext,
} from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { GetTeamAccessUseCase } from 'src/iam/teams/application/use-cases/get-team-access/get-team-access.use-case';
import { GetTeamAccessQuery } from 'src/iam/teams/application/use-cases/get-team-access/get-team-access.query';

const SHARE_PERMISSIONS: Record<
  SharedEntityType,
  Record<ShareScopeType, Permission>
> = {
  [SharedEntityType.SKILL]: {
    [ShareScopeType.TEAM]: Permission.SHARE_SKILLS_WITH_TEAMS,
    [ShareScopeType.ORG]: Permission.SHARE_SKILLS_WITH_ORG,
  },
  [SharedEntityType.KNOWLEDGE_BASE]: {
    [ShareScopeType.TEAM]: Permission.SHARE_KNOWLEDGE_BASES_WITH_TEAMS,
    [ShareScopeType.ORG]: Permission.SHARE_KNOWLEDGE_BASES_WITH_ORG,
  },
};

/**
 * Sharing is permissioned per audience, which the route guard cannot decide:
 * the scope comes from the request body on create and from the stored share on
 * delete. Sharing with a team also accepts the permission granted by the
 * user's role in that team.
 */
@Injectable()
export class SharePermissionService {
  constructor(
    private readonly context: ContextService,
    private readonly hasPermission: HasPermissionUseCase,
    private readonly getTeamAccess: GetTeamAccessUseCase,
  ) {}

  async requireSharePermission(
    entityType: SharedEntityType,
    scopeType: ShareScopeType,
    teamId?: UUID,
  ): Promise<void> {
    const permission = SHARE_PERMISSIONS[entityType][scopeType];
    const user = getRequiredUserContext(this.context);
    const allowed =
      scopeType === ShareScopeType.TEAM
        ? await this.teamGrants(user, permission, teamId)
        : await this.hasPermission.execute(
            new HasPermissionQuery(user.orgId, user.role, permission),
          );
    if (!allowed) {
      throw new UnauthorizedAccessError({ entityType, scopeType, permission });
    }
  }

  private async teamGrants(
    user: UserContext,
    permission: Permission,
    teamId: UUID | undefined,
  ): Promise<boolean> {
    if (!teamId) return false;
    const access = await this.getTeamAccess.execute(
      new GetTeamAccessQuery(
        { userId: user.userId, orgId: user.orgId, role: user.role },
        teamId,
      ),
    );
    return access.can(permission);
  }
}
