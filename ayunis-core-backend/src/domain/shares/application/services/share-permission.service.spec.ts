import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import type { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { TeamAccess } from 'src/iam/teams/application/models/team-access.model';
import type { GetTeamAccessUseCase } from 'src/iam/teams/application/use-cases/get-team-access/get-team-access.use-case';
import { GetTeamAccessQuery } from 'src/iam/teams/application/use-cases/get-team-access/get-team-access.query';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SharePermissionService } from './share-permission.service';

describe('SharePermissionService', () => {
  const orgId = randomUUID();
  const userId = randomUUID();
  const teamId = randomUUID();
  let hasPermission: { execute: jest.Mock };
  let getTeamAccess: { execute: jest.Mock };
  let service: SharePermissionService;

  const teamAccess = (teamPermissions: Permission[]) =>
    new TeamAccess({
      teamRole: UserRole.ADMIN,
      orgPermissions: [],
      teamPermissions,
    });

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
    getTeamAccess = { execute: jest.fn() };
    service = new SharePermissionService(
      context,
      hasPermission as unknown as HasPermissionUseCase,
      getTeamAccess as unknown as GetTeamAccessUseCase,
    );
  });

  it.each([
    [SharedEntityType.SKILL, Permission.SHARE_SKILLS_WITH_ORG],
    [
      SharedEntityType.KNOWLEDGE_BASE,
      Permission.SHARE_KNOWLEDGE_BASES_WITH_ORG,
    ],
  ])(
    'requires the org role permission to share a %s with the organisation',
    async (entityType, permission) => {
      hasPermission.execute.mockResolvedValue(true);

      await expect(
        service.requireSharePermission(entityType, ShareScopeType.ORG),
      ).resolves.toBeUndefined();
      expect(hasPermission.execute).toHaveBeenCalledWith(
        new HasPermissionQuery(orgId, UserRole.USER, permission),
      );
      expect(getTeamAccess.execute).not.toHaveBeenCalled();
    },
  );

  it.each([
    [SharedEntityType.SKILL, Permission.SHARE_SKILLS_WITH_TEAMS],
    [
      SharedEntityType.KNOWLEDGE_BASE,
      Permission.SHARE_KNOWLEDGE_BASES_WITH_TEAMS,
    ],
  ])(
    'accepts the team access permission to share a %s with a team',
    async (entityType, permission) => {
      getTeamAccess.execute.mockResolvedValue(teamAccess([permission]));

      await expect(
        service.requireSharePermission(entityType, ShareScopeType.TEAM, teamId),
      ).resolves.toBeUndefined();
      expect(getTeamAccess.execute).toHaveBeenCalledWith(
        new GetTeamAccessQuery({ userId, orgId, role: UserRole.USER }, teamId),
      );
    },
  );

  it('rejects a team share when the team access lacks the permission', async () => {
    getTeamAccess.execute.mockResolvedValue(
      teamAccess([Permission.SHARE_KNOWLEDGE_BASES_WITH_TEAMS]),
    );

    await expect(
      service.requireSharePermission(
        SharedEntityType.SKILL,
        ShareScopeType.TEAM,
        teamId,
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
  });

  it('rejects a team share without a team', async () => {
    await expect(
      service.requireSharePermission(
        SharedEntityType.SKILL,
        ShareScopeType.TEAM,
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(getTeamAccess.execute).not.toHaveBeenCalled();
  });

  it('rejects when the role lacks the permission for the requested scope', async () => {
    hasPermission.execute.mockResolvedValue(false);

    await expect(
      service.requireSharePermission(
        SharedEntityType.SKILL,
        ShareScopeType.ORG,
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
  });
});
