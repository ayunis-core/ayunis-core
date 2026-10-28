import { UpdateRolePermissionsUseCase } from './update-role-permissions.use-case';
import { UpdateRolePermissionsCommand } from './update-role-permissions.command';
import type { RolePermissionsRepository } from 'src/iam/permissions/application/ports/role-permissions.repository';
import { RoleNotConfigurableError } from 'src/iam/permissions/application/permissions.errors';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import type { UUID } from 'crypto';

describe('UpdateRolePermissionsUseCase', () => {
  const orgId = 'org-1' as UUID;
  let repository: jest.Mocked<Pick<RolePermissionsRepository, 'setForRole'>>;
  let useCase: UpdateRolePermissionsUseCase;

  beforeEach(() => {
    repository = { setForRole: jest.fn() };
    useCase = new UpdateRolePermissionsUseCase(
      repository as unknown as RolePermissionsRepository,
    );
  });

  it('rejects configuring the admin role', async () => {
    await expect(
      useCase.execute(
        new UpdateRolePermissionsCommand(orgId, UserRole.ADMIN, [
          Permission.MANAGE_SKILLS,
        ]),
      ),
    ).rejects.toBeInstanceOf(RoleNotConfigurableError);
    expect(repository.setForRole).not.toHaveBeenCalled();
  });

  it('deduplicates permissions before persisting', async () => {
    await useCase.execute(
      new UpdateRolePermissionsCommand(orgId, UserRole.MANAGER, [
        Permission.MANAGE_SKILLS,
        Permission.MANAGE_SKILLS,
        Permission.SHARE_SKILLS,
      ]),
    );

    expect(repository.setForRole).toHaveBeenCalledWith(
      orgId,
      UserRole.MANAGER,
      [Permission.MANAGE_SKILLS, Permission.SHARE_SKILLS],
    );
  });
});
