import { Injectable } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

const SHARE_PERMISSIONS: Partial<
  Record<SharedEntityType, Record<ShareScopeType, Permission>>
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
 * delete.
 */
@Injectable()
export class SharePermissionService {
  constructor(
    private readonly context: ContextService,
    private readonly hasPermission: HasPermissionUseCase,
  ) {}

  async requireSharePermission(
    entityType: SharedEntityType,
    scopeType: ShareScopeType,
  ): Promise<void> {
    const permission = SHARE_PERMISSIONS[entityType]?.[scopeType];
    if (!permission) {
      throw new UnauthorizedAccessError({ entityType, scopeType });
    }

    const { orgId, role } = getRequiredUserContext(this.context);
    const allowed = await this.hasPermission.execute(
      new HasPermissionQuery(orgId, role, permission),
    );
    if (!allowed) {
      throw new UnauthorizedAccessError({ entityType, scopeType, permission });
    }
  }
}
