import { HasPermissionUseCase } from './has-permission.use-case';
import { HasPermissionQuery } from './has-permission.query';
import type { RolePermissionsRepository } from '../../ports/role-permissions.repository';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { Permission } from '../../../domain/value-objects/permission.enum';
import type { UUID } from 'crypto';

describe('HasPermissionUseCase', () => {
  const orgId = 'org-1' as UUID;
  let repository: jest.Mocked<Pick<RolePermissionsRepository, 'existsForRole'>>;
  let useCase: HasPermissionUseCase;

  beforeEach(() => {
    repository = { existsForRole: jest.fn() };
    useCase = new HasPermissionUseCase(
      repository as unknown as RolePermissionsRepository,
    );
  });

  it('grants admins every permission without hitting the repository', async () => {
    const result = await useCase.execute(
      new HasPermissionQuery(orgId, UserRole.ADMIN, Permission.MANAGE_TEAMS),
    );

    expect(result).toBe(true);
    expect(repository.existsForRole).not.toHaveBeenCalled();
  });

  it.each([UserRole.MANAGER, UserRole.USER])(
    'delegates to the repository for role %s',
    async (role) => {
      repository.existsForRole.mockResolvedValue(true);

      const result = await useCase.execute(
        new HasPermissionQuery(orgId, role, Permission.MANAGE_SKILLS),
      );

      expect(result).toBe(true);
      expect(repository.existsForRole).toHaveBeenCalledWith(
        orgId,
        role,
        Permission.MANAGE_SKILLS,
      );
    },
  );

  it('denies when the repository has no matching grant', async () => {
    repository.existsForRole.mockResolvedValue(false);

    const result = await useCase.execute(
      new HasPermissionQuery(orgId, UserRole.USER, Permission.MANAGE_TEAMS),
    );

    expect(result).toBe(false);
  });
});
