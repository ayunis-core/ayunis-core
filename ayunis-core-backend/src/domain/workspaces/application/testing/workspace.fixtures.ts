import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import {
  aUserContext,
  createMockContextService as createMockUserContextService,
} from 'src/common/context/testing/context.fixtures';
import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import type { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import type { WorkspaceMembersRepository } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import type { WorkspaceMember } from 'src/domain/workspaces/domain/workspace-member.entity';
import { WorkspaceAccess } from 'src/domain/workspaces/application/models/workspace-access.model';
import type { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { GetMyPermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-my-permissions/get-my-permissions.use-case';
import { DEFAULT_ROLE_PERMISSIONS } from 'src/iam/permissions/domain/default-role-permissions.constants';
import { RolePermission } from 'src/iam/permissions/domain/role-permission.entity';
import type { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export const TEST_USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
export const TEST_ORG_ID = '22222222-2222-4222-8222-222222222222' as UUID;
export const TEST_WORKSPACE_ID = '33333333-3333-4333-8333-333333333333' as UUID;

export function aWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return new Workspace({
    id: TEST_WORKSPACE_ID,
    orgId: TEST_ORG_ID,
    name: 'Bürgeranfragen',
    description: null,
    icon: 'folder',
    color: 'violet',
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-02T10:00:00.000Z'),
    ...overrides,
  });
}

export function createMockContextService(
  values: { userId?: UUID; orgId?: UUID } = {
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  },
): jest.Mocked<ContextService> {
  const isAuthenticated = values.userId !== undefined;
  return createMockUserContextService(
    isAuthenticated ? aUserContext(values) : values,
  );
}

export function createMockWorkspacesRepository(): jest.Mocked<WorkspacesRepository> {
  return {
    findAllByUserId: jest.fn().mockResolvedValue([]),
    findAllByIds: jest.fn().mockResolvedValue([]),
    findMemberless: jest.fn().mockResolvedValue([]),
    getListStats: jest.fn().mockResolvedValue(new Map()),
    findById: jest.fn().mockResolvedValue(null),
    getContextRefs: jest.fn().mockResolvedValue({
      skillIds: [],
      knowledgeBases: [],
    }),
    save: jest
      .fn()
      .mockImplementation((workspace: Workspace) => Promise.resolve(workspace)),
    delete: jest.fn().mockResolvedValue([]),
  };
}

export function createMockWorkspaceMembersRepository(): jest.Mocked<WorkspaceMembersRepository> {
  return {
    create: jest
      .fn()
      .mockImplementation((member: WorkspaceMember) => Promise.resolve(member)),
    findWorkspaceIdsByUserId: jest.fn().mockResolvedValue([]),
    findRole: jest.fn().mockResolvedValue(null),
    findRolesByUserId: jest.fn().mockResolvedValue(new Map()),
    promoteSuccessors: jest.fn().mockResolvedValue(undefined),
  };
}

/** Grants every check with the given access; override a method to deny. */
export function createMockWorkspaceAccessService(
  access: WorkspaceAccess = WorkspaceAccess.forAdmin(),
): jest.Mocked<
  Pick<
    WorkspaceAccessService,
    'requireMember' | 'requirePermission' | 'requireAdmin' | 'forWorkspaces'
  >
> {
  return {
    requireMember: jest.fn().mockResolvedValue(access),
    requirePermission: jest.fn().mockResolvedValue(access),
    requireAdmin: jest.fn().mockResolvedValue(access),
    forWorkspaces: jest.fn((ids: UUID[]) =>
      Promise.resolve(new Map(ids.map((id) => [id, access]))),
    ),
  };
}

export type RoleMatrix = Partial<Record<UserRole, Permission[]>>;

/**
 * The real `GetMyPermissionsUseCase` over an in-memory role matrix that a test
 * can change between requests. `findByOrgId` counts matrix reads.
 */
export function createRoleMatrix(
  initial: RoleMatrix = DEFAULT_ROLE_PERMISSIONS,
) {
  let matrix: RoleMatrix = { ...initial };
  const repository = {
    findByOrgId: jest.fn((orgId: UUID) =>
      Promise.resolve(
        Object.entries(matrix).flatMap(([role, permissions]) =>
          permissions.map(
            (permission) =>
              new RolePermission({ orgId, role: role as UserRole, permission }),
          ),
        ),
      ),
    ),
  };
  return {
    repository,
    getMyPermissions: new GetMyPermissionsUseCase(
      repository as unknown as ConstructorParameters<
        typeof GetMyPermissionsUseCase
      >[0],
    ),
    set(role: UserRole, permissions: Permission[]) {
      matrix = { ...matrix, [role]: permissions };
    },
  };
}
