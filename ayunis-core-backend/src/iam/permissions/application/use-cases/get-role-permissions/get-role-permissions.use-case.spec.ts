import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { GetRolePermissionsUseCase } from './get-role-permissions.use-case';
import { GetRolePermissionsQuery } from './get-role-permissions.query';
import type { RolePermissionsRepository } from '../../ports/role-permissions.repository';
import { RolePermission } from '../../../domain/role-permission.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { Permission } from '../../../domain/value-objects/permission.enum';
import type { UUID } from 'crypto';

describe('GetRolePermissionsUseCase', () => {
  const orgId = 'org-1' as UUID;
  let repository: jest.Mocked<Pick<RolePermissionsRepository, 'findByOrgId'>>;
  let useCase: GetRolePermissionsUseCase;

  beforeEach(() => {
    repository = { findByOrgId: jest.fn() };
    useCase = new GetRolePermissionsUseCase(
      createPinoLoggerMock(),
      repository as unknown as RolePermissionsRepository,
    );
  });

  it('groups grants by configurable role and omits admin', async () => {
    repository.findByOrgId.mockResolvedValue([
      new RolePermission({
        orgId,
        role: UserRole.MANAGER,
        permission: Permission.MANAGE_SKILLS,
      }),
      new RolePermission({
        orgId,
        role: UserRole.USER,
        permission: Permission.SHARE_SKILLS,
      }),
    ]);

    const result = await useCase.execute(new GetRolePermissionsQuery(orgId));

    expect(result).toEqual([
      { role: UserRole.MANAGER, permissions: [Permission.MANAGE_SKILLS] },
      { role: UserRole.USER, permissions: [Permission.SHARE_SKILLS] },
    ]);
  });

  it('returns empty permission arrays when no grants exist', async () => {
    repository.findByOrgId.mockResolvedValue([]);

    const result = await useCase.execute(new GetRolePermissionsQuery(orgId));

    expect(result).toEqual([
      { role: UserRole.MANAGER, permissions: [] },
      { role: UserRole.USER, permissions: [] },
    ]);
  });
});
