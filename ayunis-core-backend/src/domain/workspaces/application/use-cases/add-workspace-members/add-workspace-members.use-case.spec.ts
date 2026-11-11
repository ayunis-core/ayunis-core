import { randomUUID, type UUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { WorkspaceMemberProfilesService } from 'src/domain/workspaces/application/services/workspace-member-profiles.service';
import {
  createMockContextService,
  createMockWorkspaceMembersRepository,
  createRoleMatrix,
  TEST_ORG_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import {
  WorkspaceMemberNotInOrgError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import type { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { AddWorkspaceMembersCommand } from './add-workspace-members.command';
import { AddWorkspaceMembersUseCase } from './add-workspace-members.use-case';

const ben = randomUUID();
const clara = randomUUID();

function aColleague(id: UUID, name: string): User {
  return new User({
    id,
    email: `${name.toLowerCase()}@stadt.example`,
    emailVerified: true,
    passwordHash: null,
    role: UserRole.USER,
    orgId: TEST_ORG_ID,
    name,
    hasAcceptedMarketing: false,
  });
}

function setup(callerRole: UserRole | null) {
  const members = createMockWorkspaceMembersRepository();
  members.findRole.mockResolvedValue(callerRole);
  const orgUsers = [aColleague(ben, 'Ben'), aColleague(clara, 'Clara')];
  const findUsersByIds = {
    execute: jest.fn(({ ids }: { ids: UUID[] }) =>
      Promise.resolve(orgUsers.filter((user) => ids.includes(user.id))),
    ),
  };
  const access = new WorkspaceAccessService(
    members,
    createRoleMatrix().getMyPermissions,
    createMockContextService(),
  );
  const useCase = new AddWorkspaceMembersUseCase(
    members,
    access,
    new WorkspaceMemberProfilesService(
      findUsersByIds as unknown as FindUsersByIdsUseCase,
    ),
  );
  return { useCase, members };
}

const add = (userIds: UUID[], role: UserRole) =>
  new AddWorkspaceMembersCommand({
    workspaceId: TEST_WORKSPACE_ID,
    userIds,
    role,
  });

describe(AddWorkspaceMembersUseCase.name, () => {
  it('lets a manager add colleagues as users or managers', async () => {
    const { useCase, members } = setup(UserRole.MANAGER);

    const added = await useCase.execute(add([ben, clara], UserRole.MANAGER));

    expect(added.map(({ member, name }) => [member.userId, name])).toEqual([
      [ben, 'Ben'],
      [clara, 'Clara'],
    ]);
    const saved = members.addMany.mock.calls[0][0];
    expect(saved.map((member) => member.role)).toEqual([
      UserRole.MANAGER,
      UserRole.MANAGER,
    ]);
  });

  it('does not let a manager make anyone a workspace admin', async () => {
    const { useCase, members } = setup(UserRole.MANAGER);

    await expect(
      useCase.execute(add([ben], UserRole.ADMIN)),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(members.addMany).not.toHaveBeenCalled();
  });

  it('lets a workspace admin add admins', async () => {
    const { useCase } = setup(UserRole.ADMIN);

    const added = await useCase.execute(add([ben], UserRole.ADMIN));

    expect(added[0].member.role).toBe(UserRole.ADMIN);
  });

  it('does not let a workspace user add anyone', async () => {
    const { useCase, members } = setup(UserRole.USER);

    await expect(
      useCase.execute(add([ben], UserRole.USER)),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(members.addMany).not.toHaveBeenCalled();
  });

  it('hides the workspace from a non-member', async () => {
    const { useCase, members } = setup(null);

    await expect(
      useCase.execute(add([ben], UserRole.USER)),
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    expect(members.addMany).not.toHaveBeenCalled();
  });

  it('adds nobody when one of the users is not in the organization', async () => {
    const { useCase, members } = setup(UserRole.ADMIN);
    const outsider = randomUUID();

    await expect(
      useCase.execute(add([ben, outsider], UserRole.USER)),
    ).rejects.toBeInstanceOf(WorkspaceMemberNotInOrgError);
    expect(members.addMany).not.toHaveBeenCalled();
  });

  it('returns only the users who were not members yet', async () => {
    const { useCase, members } = setup(UserRole.ADMIN);
    members.addMany.mockImplementation((candidates) =>
      Promise.resolve(candidates.filter(({ userId }) => userId === clara)),
    );

    const added = await useCase.execute(add([ben, clara, ben], UserRole.USER));

    expect(members.addMany.mock.calls[0][0]).toHaveLength(2);
    expect(added.map(({ member }) => member.userId)).toEqual([clara]);
  });
});
