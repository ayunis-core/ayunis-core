import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import type { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SharePermissionService } from './share-permission.service';

describe('SharePermissionService', () => {
  const orgId = randomUUID();
  const userId = randomUUID();
  let hasPermission: { execute: jest.Mock };
  let service: SharePermissionService;

  beforeEach(() => {
    const userContext: Record<string, unknown> = {
      userId,
      orgId,
      role: UserRole.USER,
      systemRole: SystemRole.CUSTOMER,
    };
    const context = {
      get: jest.fn((key: string) => userContext[key]),
    } as unknown as ContextService;
    hasPermission = { execute: jest.fn() };
    service = new SharePermissionService(
      context,
      hasPermission as unknown as HasPermissionUseCase,
    );
  });

  it.each([
    [
      SharedEntityType.SKILL,
      ShareScopeType.TEAM,
      Permission.SHARE_SKILLS_WITH_TEAMS,
    ],
    [
      SharedEntityType.SKILL,
      ShareScopeType.ORG,
      Permission.SHARE_SKILLS_WITH_ORG,
    ],
    [
      SharedEntityType.KNOWLEDGE_BASE,
      ShareScopeType.TEAM,
      Permission.SHARE_KNOWLEDGE_BASES_WITH_TEAMS,
    ],
    [
      SharedEntityType.KNOWLEDGE_BASE,
      ShareScopeType.ORG,
      Permission.SHARE_KNOWLEDGE_BASES_WITH_ORG,
    ],
  ])(
    'requires the matching permission to share a %s with %s scope',
    async (entityType, scopeType, permission) => {
      hasPermission.execute.mockResolvedValue(true);

      await expect(
        service.requireSharePermission(entityType, scopeType),
      ).resolves.toBeUndefined();
      expect(hasPermission.execute).toHaveBeenCalledWith(
        new HasPermissionQuery(orgId, UserRole.USER, permission),
      );
    },
  );

  it('rejects when the role lacks the permission for the requested scope', async () => {
    hasPermission.execute.mockResolvedValue(false);

    await expect(
      service.requireSharePermission(
        SharedEntityType.SKILL,
        ShareScopeType.ORG,
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
  });

  it('rejects entity types that have no share permission', async () => {
    await expect(
      service.requireSharePermission(
        SharedEntityType.PROMPT,
        ShareScopeType.ORG,
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(hasPermission.execute).not.toHaveBeenCalled();
  });
});
