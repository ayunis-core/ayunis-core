import { randomUUID } from 'crypto';
import { aUserContext } from 'src/common/context/testing/context.fixtures';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import {
  createMockContextService,
  createMockWorkspaceMembersRepository,
  createRoleMatrix,
  TEST_ORG_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { createMockContextService as createMockUserContextService } from 'src/common/context/testing/context.fixtures';

const ALL_WORKSPACE_PERMISSIONS = [
  Permission.MANAGE_WORKSPACE,
  Permission.MANAGE_WORKSPACE_MEMBERS,
];

function setup(orgRole: UserRole = UserRole.USER) {
  const members = createMockWorkspaceMembersRepository();
  const matrix = createRoleMatrix();
  const context = createMockUserContextService(
    aUserContext({ userId: TEST_USER_ID, orgId: TEST_ORG_ID, role: orgRole }),
  );
  const asMember = (role: UserRole | null) =>
    members.findRole.mockResolvedValue(role);
  return {
    members,
    matrix,
    context,
    asMember,
    service: new WorkspaceAccessService(
      members,
      matrix.getMyPermissions,
      context,
    ),
  };
}

describe(WorkspaceAccessService.name, () => {
  it('hides the workspace from a non-member, even an org admin', async () => {
    const { service, members, asMember } = setup(UserRole.ADMIN);
    asMember(null);

    await expect(
      service.requireMember(TEST_WORKSPACE_ID),
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    await expect(
      service.requirePermission(TEST_WORKSPACE_ID, Permission.MANAGE_WORKSPACE),
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    await expect(
      service.requireAdmin(TEST_WORKSPACE_ID),
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    expect(members.findRole).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      TEST_USER_ID,
      TEST_ORG_ID,
    );
  });

  it('grants a workspace admin every workspace permission whatever the matrix says', async () => {
    const { service, matrix, asMember } = setup();
    matrix.set(UserRole.MANAGER, []);
    asMember(UserRole.ADMIN);

    const access = await service.requireAdmin(TEST_WORKSPACE_ID);

    expect(access.permissions).toEqual(ALL_WORKSPACE_PERMISSIONS);
  });

  it('limits a manager to the workspace part of the manager row', async () => {
    const { service, asMember } = setup();
    asMember(UserRole.MANAGER);

    const access = await service.requirePermission(
      TEST_WORKSPACE_ID,
      Permission.MANAGE_WORKSPACE,
    );

    expect(access).toMatchObject({
      role: UserRole.MANAGER,
      permissions: ALL_WORKSPACE_PERMISSIONS,
    });
    await expect(
      service.requireAdmin(TEST_WORKSPACE_ID),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
  });

  it('lets a user read but not manage the workspace by default', async () => {
    const { service, asMember } = setup();
    asMember(UserRole.USER);

    await expect(
      service.requireMember(TEST_WORKSPACE_ID),
    ).resolves.toMatchObject({ role: UserRole.USER, permissions: [] });
    await expect(
      service.requirePermission(TEST_WORKSPACE_ID, Permission.MANAGE_WORKSPACE),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
  });

  it('ignores the org role inside a workspace', async () => {
    const { service, asMember } = setup(UserRole.ADMIN);
    asMember(UserRole.USER);

    await expect(
      service.requirePermission(TEST_WORKSPACE_ID, Permission.MANAGE_WORKSPACE),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
  });

  it('follows changes to the role matrix', async () => {
    const { service, matrix, asMember } = setup();
    asMember(UserRole.USER);
    matrix.set(UserRole.USER, [Permission.MANAGE_WORKSPACE]);

    await expect(
      service.requirePermission(TEST_WORKSPACE_ID, Permission.MANAGE_WORKSPACE),
    ).resolves.toMatchObject({ permissions: [Permission.MANAGE_WORKSPACE] });

    asMember(UserRole.MANAGER);
    matrix.set(UserRole.MANAGER, [Permission.MANAGE_WORKSPACE_MEMBERS]);

    await expect(
      service.requirePermission(TEST_WORKSPACE_ID, Permission.MANAGE_WORKSPACE),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
  });

  it('resolves each member role of a workspace list with one matrix read per role', async () => {
    const { service, members, matrix } = setup();
    const [first, second, third] = [randomUUID(), randomUUID(), randomUUID()];
    members.findRolesByUserId.mockResolvedValue(
      new Map([
        [first, UserRole.USER],
        [second, UserRole.USER],
        [third, UserRole.ADMIN],
      ]),
    );

    const accesses = await service.forWorkspaces([first, second, third]);

    expect(accesses.get(first)?.permissions).toEqual([]);
    expect(accesses.get(second)?.permissions).toEqual([]);
    expect(accesses.get(third)?.permissions).toEqual(ALL_WORKSPACE_PERMISSIONS);
    expect(matrix.repository.findByOrgId).toHaveBeenCalledTimes(1);
  });

  it('rejects unauthenticated callers before querying persistence', async () => {
    const members = createMockWorkspaceMembersRepository();
    const context = createMockContextService({});
    const service = new WorkspaceAccessService(
      members,
      createRoleMatrix().getMyPermissions,
      context,
    );

    await expect(
      service.requireMember(TEST_WORKSPACE_ID),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(members.findRole).not.toHaveBeenCalled();
  });
});
