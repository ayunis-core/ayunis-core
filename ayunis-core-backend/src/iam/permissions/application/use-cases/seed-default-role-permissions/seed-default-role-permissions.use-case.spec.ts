import { SeedDefaultRolePermissionsUseCase } from './seed-default-role-permissions.use-case';
import { SeedDefaultRolePermissionsCommand } from './seed-default-role-permissions.command';
import type { RolePermissionsRepository } from 'src/iam/permissions/application/ports/role-permissions.repository';
import {
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
} from 'src/iam/permissions/domain/default-role-permissions.constants';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { UUID } from 'crypto';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

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

  it('grants new orgs the decided default matrix', () => {
    const userDefaults = [
      Permission.MANAGE_OWN_SKILLS,
      Permission.INSTALL_MARKETPLACE_SKILLS,
      Permission.REQUEST_SKILL_TRANSFER,
      Permission.REQUEST_SKILL_TRANSFER_ORG,
      Permission.MANAGE_OWN_KNOWLEDGE,
      Permission.REQUEST_KNOWLEDGE_TRANSFER,
      Permission.REQUEST_KNOWLEDGE_TRANSFER_ORG,
      Permission.CREATE_WORKSPACES,
      Permission.SHARE_WORKSPACES,
    ];

    expect(DEFAULT_ROLE_PERMISSIONS[UserRole.USER]).toEqual(userDefaults);
    expect(DEFAULT_ROLE_PERMISSIONS[UserRole.MANAGER]).toEqual([
      Permission.ASSIGN_USERS_TO_TEAMS,
      ...userDefaults,
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
