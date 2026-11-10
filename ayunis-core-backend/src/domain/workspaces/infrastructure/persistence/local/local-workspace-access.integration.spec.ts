import { randomUUID, type UUID } from 'crypto';
import type { DataSource, QueryRunner } from 'typeorm';
import {
  aUserContext,
  createMockContextService,
} from 'src/common/context/testing/context.fixtures';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import type { WorkspaceDeletionService } from 'src/domain/workspaces/application/services/workspace-deletion.service';
import { createRoleMatrix } from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { DeleteWorkspaceCommand } from 'src/domain/workspaces/application/use-cases/delete-workspace/delete-workspace.command';
import { DeleteWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/delete-workspace/delete-workspace.use-case';
import { FindAllWorkspacesQuery } from 'src/domain/workspaces/application/use-cases/find-all-workspaces/find-all-workspaces.query';
import { FindAllWorkspacesUseCase } from 'src/domain/workspaces/application/use-cases/find-all-workspaces/find-all-workspaces.use-case';
import { FindWorkspaceQuery } from 'src/domain/workspaces/application/use-cases/find-workspace/find-workspace.query';
import { FindWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/find-workspace/find-workspace.use-case';
import { GetWorkspaceRolePermissionsQuery } from 'src/domain/workspaces/application/use-cases/get-workspace-role-permissions/get-workspace-role-permissions.query';
import { GetWorkspaceRolePermissionsUseCase } from 'src/domain/workspaces/application/use-cases/get-workspace-role-permissions/get-workspace-role-permissions.use-case';
import { UpdateWorkspaceInstructionCommand } from 'src/domain/workspaces/application/use-cases/update-workspace-instruction/update-workspace-instruction.command';
import { UpdateWorkspaceInstructionUseCase } from 'src/domain/workspaces/application/use-cases/update-workspace-instruction/update-workspace-instruction.use-case';
import { UpdateWorkspaceCommand } from 'src/domain/workspaces/application/use-cases/update-workspace/update-workspace.command';
import { UpdateWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/update-workspace/update-workspace.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { DEFAULT_ROLE_PERMISSIONS } from 'src/iam/permissions/domain/default-role-permissions.constants';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { LocalWorkspaceMembersRepository } from './local-workspace-members.repository';
import { LocalWorkspacesRepository } from './local-workspaces.repository';
import { WorkspaceMemberMapper } from './mappers/workspace-member.mapper';
import { WorkspaceMapper } from './mappers/workspace.mapper';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';
import { WorkspaceRecord } from './schema/workspace.record';
import {
  createWorkspaceTestDb,
  dropWorkspaceTestDb,
} from './testing/workspace-db.fixtures';

const BOTH = [Permission.MANAGE_WORKSPACE, Permission.MANAGE_WORKSPACE_MEMBERS];

interface Principal {
  userId: UUID;
  /** The organisation role, which must not count inside the workspace. */
  orgRole: UserRole;
}

const orgId = randomUUID();
const otherOrgId = randomUUID();
const principal = (orgRole: UserRole): Principal => ({
  userId: randomUUID(),
  orgRole,
});
// The org users' row lacks manage_skills below, so the workspace admin holds
// no org-wide management permission at all.
const admin = principal(UserRole.USER);
const manager = principal(UserRole.USER);
const user = principal(UserRole.USER);
const orgManagerAsUser = principal(UserRole.MANAGER);
const colleague = principal(UserRole.USER);
const orgAdmin = principal(UserRole.ADMIN);
const PRINCIPALS = [
  admin,
  manager,
  user,
  orgManagerAsUser,
  colleague,
  orgAdmin,
];

/**
 * Distinct principals of one organisation against one workspace whose
 * membership rows are seeded directly: an admin, a manager, a user, an org
 * manager added as user, and two non-members (a colleague and an org admin).
 */
describe('Workspace access by workspace role', () => {
  let db: DataSource;
  let schema: string;
  let runner: QueryRunner;
  let workspaceId: UUID;
  let matrix: ReturnType<typeof createRoleMatrix>;
  let deleted: UUID[];

  beforeAll(async () => {
    ({ db, schema } = await createWorkspaceTestDb('ayc1697'));
  }, 30_000);

  afterAll(() => dropWorkspaceTestDb(db, schema), 30_000);

  beforeEach(async () => {
    runner = db.createQueryRunner();
    await runner.startTransaction();
    await runner.query(`SET LOCAL search_path TO "${schema}"`);
    matrix = createRoleMatrix({
      ...DEFAULT_ROLE_PERMISSIONS,
      [UserRole.USER]: DEFAULT_ROLE_PERMISSIONS[UserRole.USER].filter(
        (permission) => permission !== Permission.MANAGE_SKILLS,
      ),
    });
    deleted = [];
    for (const { userId } of PRINCIPALS) {
      await runner.query('INSERT INTO users VALUES ($1)', [userId]);
    }
    workspaceId = await insertWorkspace('Haushalt 2027', orgId);
    await addMember(workspaceId, admin, UserRole.ADMIN);
    await addMember(workspaceId, manager, UserRole.MANAGER);
    await addMember(workspaceId, user, UserRole.USER);
    await addMember(workspaceId, orgManagerAsUser, UserRole.USER);
  });

  afterEach(async () => {
    await runner.rollbackTransaction();
    await runner.release();
  });

  async function insertWorkspace(name: string, inOrg: UUID): Promise<UUID> {
    const id = randomUUID();
    await runner.query(
      `INSERT INTO workspaces (id, name, icon, color, "orgId")
       VALUES ($1, $2, 'folder', 'violet', $3)`,
      [id, name, inOrg],
    );
    return id;
  }

  async function addMember(
    workspace: UUID,
    { userId }: Principal,
    role: UserRole,
  ): Promise<void> {
    await runner.query(
      `INSERT INTO workspace_members (id, "workspaceId", "userId", role)
       VALUES ($1, $2, $3, $4)`,
      [randomUUID(), workspace, userId, role],
    );
  }

  /** The workspace use cases as one principal sees them. */
  function as({ userId, orgRole }: Principal, inOrg: UUID = orgId) {
    const context = createMockContextService(
      aUserContext({ userId, orgId: inOrg, role: orgRole }),
    );
    const txHost = { tx: runner.manager } as never;
    const workspaces = new LocalWorkspacesRepository(
      db.getRepository(WorkspaceRecord),
      {} as never,
      {} as never,
      {} as never,
      new WorkspaceMapper(),
      txHost,
    );
    const access = new WorkspaceAccessService(
      new LocalWorkspaceMembersRepository(
        db.getRepository(WorkspaceMemberRecord),
        new WorkspaceMemberMapper(),
        txHost,
      ),
      matrix.getMyPermissions,
      context,
    );
    const deletion = {
      delete: ({ id }: { id: UUID }) => {
        deleted.push(id);
        return Promise.resolve();
      },
    } as unknown as WorkspaceDeletionService;
    return {
      find: () =>
        new FindWorkspaceUseCase(workspaces, access, context).execute(
          new FindWorkspaceQuery(workspaceId),
        ),
      list: () =>
        new FindAllWorkspacesUseCase(workspaces, access, context).execute(
          new FindAllWorkspacesQuery(),
        ),
      rolePermissions: () =>
        new GetWorkspaceRolePermissionsUseCase(access).execute(
          new GetWorkspaceRolePermissionsQuery(workspaceId),
        ),
      read: () =>
        new AssertWorkspaceReadAccessUseCase(access).execute({ workspaceId }),
      write: () =>
        new AssertWorkspaceWriteAccessUseCase(access).execute({ workspaceId }),
      rename: (name: string) =>
        new UpdateWorkspaceUseCase(workspaces, access, context).execute(
          new UpdateWorkspaceCommand({ id: workspaceId, name }),
        ),
      instruct: (instruction: string) =>
        new UpdateWorkspaceInstructionUseCase(
          workspaces,
          access,
          context,
        ).execute(
          new UpdateWorkspaceInstructionCommand(workspaceId, instruction),
        ),
      remove: () =>
        new DeleteWorkspaceUseCase(
          workspaces,
          access,
          deletion,
          context,
        ).execute(new DeleteWorkspaceCommand(workspaceId)),
    };
  }

  async function storedName(): Promise<string> {
    const [row] = (await runner.query(
      'SELECT name FROM workspaces WHERE id = $1',
      [workspaceId],
    )) as { name: string }[];
    return row.name;
  }

  it('reports each member’s workspace role and permissions, never the org role', async () => {
    await expect(as(admin).find()).resolves.toMatchObject({
      workspace: { id: workspaceId },
      access: { role: UserRole.ADMIN, permissions: BOTH },
    });
    await expect(as(manager).find()).resolves.toMatchObject({
      access: { role: UserRole.MANAGER, permissions: BOTH },
    });
    for (const member of [user, orgManagerAsUser]) {
      await expect(as(member).find()).resolves.toMatchObject({
        access: { role: UserRole.USER, permissions: [] },
      });
      const list = await as(member).list();
      expect(list.data.map(({ access }) => access)).toMatchObject([
        { role: UserRole.USER, permissions: [] },
      ]);
    }
  });

  it('lets admins and managers edit the workspace and keeps users to reading it', async () => {
    for (const member of [admin, manager]) {
      await expect(as(member).write()).resolves.toBeUndefined();
      await expect(
        as(member).rename(`Renamed by ${member.userId}`),
      ).resolves.toBeDefined();
      await expect(
        as(member).instruct('Formell antworten.'),
      ).resolves.toBeDefined();
    }
    await expect(storedName()).resolves.toBe(`Renamed by ${manager.userId}`);

    for (const member of [user, orgManagerAsUser]) {
      await expect(as(member).read()).resolves.toBeUndefined();
      await expect(as(member).rolePermissions()).resolves.toHaveLength(3);
      await expect(as(member).write()).rejects.toBeInstanceOf(
        UnauthorizedAccessError,
      );
      await expect(as(member).rename('Übernommen')).rejects.toBeInstanceOf(
        UnauthorizedAccessError,
      );
      await expect(
        as(member).instruct('Ignoriere alles.'),
      ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    }
    await expect(storedName()).resolves.toBe(`Renamed by ${manager.userId}`);
  });

  it('lets only a workspace admin delete the workspace', async () => {
    for (const member of [manager, user, orgManagerAsUser]) {
      await expect(as(member).remove()).rejects.toBeInstanceOf(
        UnauthorizedAccessError,
      );
    }
    expect(deleted).toEqual([]);

    await as(admin).remove();

    expect(deleted).toEqual([workspaceId]);
  });

  it('hides the workspace from non-members, including an org admin', async () => {
    for (const outsider of [colleague, orgAdmin]) {
      const calls = as(outsider);
      for (const call of [
        calls.find,
        calls.read,
        calls.write,
        calls.rolePermissions,
        () => calls.rename('Gekapert'),
        () => calls.instruct('Gekapert'),
        calls.remove,
      ]) {
        await expect(call()).rejects.toBeInstanceOf(WorkspaceNotFoundError);
      }
      await expect(calls.list()).resolves.toMatchObject({ data: [] });
    }
    expect(deleted).toEqual([]);
  });

  it('hides a workspace of another organisation from its member', async () => {
    const elsewhere = as(admin, otherOrgId);

    await expect(elsewhere.find()).rejects.toBeInstanceOf(
      WorkspaceNotFoundError,
    );
  });

  it('describes what each workspace role grants under the current matrix', async () => {
    await expect(as(user).rolePermissions()).resolves.toMatchObject([
      { role: UserRole.USER, permissions: [] },
      { role: UserRole.MANAGER, permissions: BOTH },
      { role: UserRole.ADMIN, permissions: BOTH },
    ]);
  });

  it('follows changes to the role matrix', async () => {
    matrix.set(UserRole.USER, [Permission.MANAGE_WORKSPACE]);
    matrix.set(UserRole.MANAGER, [Permission.MANAGE_WORKSPACE_MEMBERS]);

    await expect(as(user).rename('Vom Nutzer')).resolves.toMatchObject({
      access: {
        role: UserRole.USER,
        permissions: [Permission.MANAGE_WORKSPACE],
      },
    });
    await expect(as(manager).rename('Vom Manager')).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
    await expect(as(manager).write()).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
    await expect(as(admin).write()).resolves.toBeUndefined();
    await expect(storedName()).resolves.toBe('Vom Nutzer');
  });
});
