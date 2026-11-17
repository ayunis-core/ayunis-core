import { SeedDefaultRolePermissionsUseCase } from './seed-default-role-permissions.use-case';
import { SeedDefaultRolePermissionsCommand } from './seed-default-role-permissions.command';
import type { RolePermissionsRepository } from 'src/iam/permissions/application/ports/role-permissions.repository';
import {
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
} from 'src/iam/permissions/domain/default-role-permissions.constants';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import type { UUID } from 'crypto';

describe('SeedDefaultRolePermissionsUseCase', () => {
  const orgId = 'org-1' as UUID;
  let repository: jest.Mocked<
    Pick<RolePermissionsRepository, 'setForRole' | 'setForRoles'>
  >;
  let useCase: SeedDefaultRolePermissionsUseCase;

  beforeEach(() => {
    repository = { setForRole: jest.fn(), setForRoles: jest.fn() };
    useCase = new SeedDefaultRolePermissionsUseCase(
      repository as unknown as RolePermissionsRepository,
    );
  });

  it('grants every configurable role its default permissions', async () => {
    await useCase.execute(new SeedDefaultRolePermissionsCommand(orgId));

    expect(repository.setForRoles).toHaveBeenCalledWith(
      orgId,
      CONFIGURABLE_ROLES.map((role) => ({
        role,
        permissions: DEFAULT_ROLE_PERMISSIONS[role],
      })),
    );
  });

  it('lets managers and users manage routines and install Marketplace skills in a new organization', async () => {
    await useCase.execute(new SeedDefaultRolePermissionsCommand(orgId));

    const [, grants] = repository.setForRoles.mock.calls[0];
    const memberDefaults = expect.arrayContaining([
      Permission.MANAGE_ROUTINES,
      Permission.INSTALL_MARKETPLACE_SKILLS,
    ]);
    expect(grants).toEqual([
      { role: UserRole.MANAGER, permissions: memberDefaults },
      { role: UserRole.USER, permissions: memberDefaults },
    ]);
  });

  it('writes all roles in a single call so a failure cannot half-seed the matrix', async () => {
    await useCase.execute(new SeedDefaultRolePermissionsCommand(orgId));

    expect(repository.setForRoles).toHaveBeenCalledTimes(1);
    expect(repository.setForRole).not.toHaveBeenCalled();
  });

  it('never seeds the admin role, which is implicitly all-permissions', async () => {
    await useCase.execute(new SeedDefaultRolePermissionsCommand(orgId));

    const [, grants] = repository.setForRoles.mock.calls[0];
    expect(grants.map((grant) => grant.role)).not.toContain(UserRole.ADMIN);
  });

  it('propagates failures so the caller can abort org creation', async () => {
    repository.setForRoles.mockRejectedValueOnce(new Error('db down'));

    await expect(
      useCase.execute(new SeedDefaultRolePermissionsCommand(orgId)),
    ).rejects.toThrow();
  });
});
