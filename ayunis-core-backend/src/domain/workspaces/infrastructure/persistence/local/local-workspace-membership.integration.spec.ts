import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { DataSource, type QueryRunner } from 'typeorm';
import {
  aUserContext,
  createMockContextService,
} from 'src/common/context/testing/context.fixtures';
import { CreateWorkspaceCommand } from 'src/domain/workspaces/application/use-cases/create-workspace/create-workspace.command';
import { CreateWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/create-workspace/create-workspace.use-case';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
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
  WORKSPACE_TABLES,
} from './testing/workspace-db.fixtures';

const orgId = randomUUID();
const owner = randomUUID();
const colleague = randomUUID();
const orgAdmin = randomUUID();
const page = { sort: 'updatedAt', limit: 20, offset: 0 } as const;

/**
 * Distinct principals in one organization: the owner created both workspaces,
 * the colleague and the org admin are not members until a membership row is
 * inserted for them.
 */
describe('Workspace membership persistence', () => {
  let db: DataSource;
  let schema: string;
  let runner: QueryRunner;
  let workspaces: LocalWorkspacesRepository;
  let members: LocalWorkspaceMembersRepository;
  let budget: UUID;
  let permits: UUID;

  beforeAll(async () => {
    ({ db, schema } = await createWorkspaceTestDb('ayc1696'));
  }, 30_000);

  afterAll(() => dropWorkspaceTestDb(db, schema), 30_000);

  beforeEach(async () => {
    runner = db.createQueryRunner();
    await runner.startTransaction();
    await runner.query(`SET LOCAL search_path TO "${schema}"`);
    const txHost = { tx: runner.manager } as never;
    workspaces = new LocalWorkspacesRepository(
      db.getRepository(WorkspaceRecord),
      {} as never,
      {} as never,
      {} as never,
      new WorkspaceMapper(),
      txHost,
    );
    members = new LocalWorkspaceMembersRepository(
      db.getRepository(WorkspaceMemberRecord),
      new WorkspaceMemberMapper(),
      txHost,
    );
    await runner.query('INSERT INTO users VALUES ($1), ($2), ($3)', [
      owner,
      colleague,
      orgAdmin,
    ]);
    budget = await insertWorkspace('Haushalt 2027', '2026-03-01T09:00:00Z');
    permits = await insertWorkspace('Bauanträge', '2026-04-01T09:00:00Z');
    await addMember(budget, owner, UserRole.ADMIN, '2026-03-01T09:00:00Z');
    await addMember(permits, owner, UserRole.ADMIN, '2026-04-01T09:00:00Z');
  });

  afterEach(async () => {
    await runner.rollbackTransaction();
    await runner.release();
  });

  async function insertWorkspace(name: string, createdAt: string) {
    const id = randomUUID();
    await runner.query(
      `INSERT INTO workspaces (id, "createdAt", "updatedAt", name, icon, color, "orgId")
       VALUES ($1, $2, $2, $3, 'folder', 'violet', $4)`,
      [id, new Date(createdAt), name, orgId],
    );
    return id;
  }

  async function addMember(
    workspaceId: UUID,
    userId: UUID,
    role: UserRole,
    createdAt: string,
  ): Promise<void> {
    await runner.query(
      `INSERT INTO workspace_members (id, "createdAt", "workspaceId", "userId", role)
       VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), new Date(createdAt), workspaceId, userId, role],
    );
  }

  async function roles(workspaceId: UUID): Promise<Record<string, string>> {
    const rows: { userId: string; role: string }[] = await runner.query(
      'SELECT "userId", role FROM workspace_members WHERE "workspaceId" = $1',
      [workspaceId],
    );
    return Object.fromEntries(rows.map((row) => [row.userId, row.role]));
  }

  const names = (items: { name: string }[]) =>
    items.map(({ name }) => name).sort((a, b) => a.localeCompare(b));

  describe('lookups', () => {
    it('hides workspaces from a colleague and an org admin until they are members', async () => {
      for (const userId of [colleague, orgAdmin]) {
        await expect(workspaces.findById(userId, budget)).resolves.toBeNull();
        await expect(
          workspaces.findAllByIds(userId, [budget, permits]),
        ).resolves.toEqual([]);
        await expect(
          workspaces.findAllByUserId(userId, page),
        ).resolves.toMatchObject({ data: [], total: 0 });
      }

      await addMember(budget, colleague, UserRole.USER, '2026-05-01T09:00:00Z');

      await expect(
        workspaces.findById(colleague, budget),
      ).resolves.toMatchObject({ id: budget, orgId });
      await expect(
        workspaces.findAllByIds(colleague, [budget, permits]).then(names),
      ).resolves.toEqual(['Haushalt 2027']);
      const list = await workspaces.findAllByUserId(colleague, page);
      expect(names(list.data)).toEqual(['Haushalt 2027']);
      expect(list.total).toBe(1);
      await expect(workspaces.findById(orgAdmin, budget)).resolves.toBeNull();
    });

    it('lists, searches and counts the member workspaces of the owner', async () => {
      const list = await workspaces.findAllByUserId(owner, page);
      expect(names(list.data)).toEqual(['Bauanträge', 'Haushalt 2027']);
      expect(list.total).toBe(2);

      const searched = await workspaces.findAllByUserId(owner, {
        ...page,
        search: 'haus',
      });
      expect(names(searched.data)).toEqual(['Haushalt 2027']);
      expect(searched.total).toBe(1);
    });

    it('counts only the requesting member’s own chats in the list stats', async () => {
      await addMember(budget, colleague, UserRole.USER, '2026-05-01T09:00:00Z');
      const ownChatAt = new Date('2026-06-01T09:00:00Z');
      await runner.query(
        `INSERT INTO threads (id, "userId", "workspaceId", "createdAt")
         VALUES ($1, $2, $3, $4), ($5, $6, $3, $7)`,
        [
          randomUUID(),
          owner,
          budget,
          ownChatAt,
          randomUUID(),
          colleague,
          new Date('2026-07-01T09:00:00Z'),
        ],
      );

      const stats = await workspaces.getListStats(owner, [budget]);

      expect(stats.get(budget)).toMatchObject({
        chatCount: 1,
        lastActivityAt: ownChatAt,
      });
    });
  });

  describe('workspaces left behind by a deleted account', () => {
    it('keeps the workspace and its other memberships when a member account is deleted', async () => {
      await addMember(budget, colleague, UserRole.USER, '2026-05-01T09:00:00Z');

      await runner.query('DELETE FROM users WHERE id = $1', [owner]);

      await expect(
        workspaces.findById(colleague, budget),
      ).resolves.toMatchObject({ id: budget });
      await expect(roles(budget)).resolves.toEqual({
        [colleague]: UserRole.USER,
      });
    });

    it('promotes the longest-standing remaining member where no admin is left', async () => {
      await addMember(budget, orgAdmin, UserRole.USER, '2026-06-01T09:00:00Z');
      await addMember(
        budget,
        colleague,
        UserRole.MANAGER,
        '2026-05-01T09:00:00Z',
      );
      await addMember(
        permits,
        colleague,
        UserRole.USER,
        '2026-05-01T09:00:00Z',
      );
      await addMember(
        permits,
        orgAdmin,
        UserRole.ADMIN,
        '2026-06-01T09:00:00Z',
      );
      await runner.query('DELETE FROM users WHERE id = $1', [owner]);

      await members.promoteSuccessors([budget, permits]);

      await expect(roles(budget)).resolves.toEqual({
        [colleague]: UserRole.ADMIN,
        [orgAdmin]: UserRole.USER,
      });
      await expect(roles(permits)).resolves.toEqual({
        [colleague]: UserRole.USER,
        [orgAdmin]: UserRole.ADMIN,
      });
    });

    it('finds the workspaces a deleted account leaves without members', async () => {
      await addMember(
        permits,
        colleague,
        UserRole.USER,
        '2026-05-01T09:00:00Z',
      );
      await expect(members.findWorkspaceIdsByUserId(owner)).resolves.toEqual(
        expect.arrayContaining([budget, permits]),
      );

      await runner.query('DELETE FROM users WHERE id = $1', [owner]);

      await expect(
        workspaces.findMemberless([budget, permits]).then(names),
      ).resolves.toEqual(['Haushalt 2027']);
    });
  });
});

describe('Creating a workspace', () => {
  let db: DataSource;
  let schema: string;
  let workspaces: LocalWorkspacesRepository;
  let members: LocalWorkspaceMembersRepository;
  const creator = randomUUID();

  const createAs = (userId: UUID) =>
    new CreateWorkspaceUseCase(
      workspaces,
      members,
      createMockContextService(aUserContext({ userId, orgId })),
    );

  beforeAll(async () => {
    ({ db, schema } = await createWorkspaceTestDb(
      'ayc1696_create',
      WORKSPACE_TABLES.slice(0, 3),
    ));
    await db.query(`INSERT INTO "${schema}".users VALUES ($1)`, [creator]);

    const adapter = new TransactionalAdapterTypeOrm({
      dataSourceToken: DataSource,
    });
    const txHost = new TransactionHost<TransactionalAdapterTypeOrm>({
      ...adapter.optionsFactory(db),
      connectionName: undefined,
      enableTransactionProxy: false,
      defaultTxOptions: {},
      extraProviderTokens: [],
    });
    workspaces = new LocalWorkspacesRepository(
      db.getRepository(WorkspaceRecord),
      {} as never,
      {} as never,
      {} as never,
      new WorkspaceMapper(),
      txHost,
    );
    members = new LocalWorkspaceMembersRepository(
      db.getRepository(WorkspaceMemberRecord),
      new WorkspaceMemberMapper(),
      txHost,
    );
  }, 30_000);

  afterAll(() => dropWorkspaceTestDb(db, schema), 30_000);

  it('stores the creator as the admin of the new workspace', async () => {
    const { workspace } = await createAs(creator).execute(
      new CreateWorkspaceCommand({ name: 'Feuerwehr' }),
    );

    await expect(
      db.query(
        `SELECT "userId", role FROM "${schema}".workspace_members WHERE "workspaceId" = $1`,
        [workspace.id],
      ),
    ).resolves.toEqual([{ userId: creator, role: UserRole.ADMIN }]);
  });

  it('does not keep a workspace whose creator could not be added as admin', async () => {
    const unknownCreator = randomUUID();

    await expect(
      createAs(unknownCreator).execute(
        new CreateWorkspaceCommand({ name: 'Ohne Admin' }),
      ),
    ).rejects.toBeInstanceOf(UnexpectedWorkspaceError);
    await expect(
      db.query(
        `SELECT id FROM "${schema}".workspaces WHERE name = 'Ohne Admin'`,
      ),
    ).resolves.toEqual([]);
  });
});
