jest.mock('@nestjs-cls/transactional', () => ({
  ...jest.requireActual<object>('@nestjs-cls/transactional'),
  Transactional: () => () => undefined,
}));

import { randomUUID, type UUID } from 'crypto';
import type { DataSource, QueryRunner } from 'typeorm';
import {
  aUserContext,
  createMockContextService,
} from 'src/common/context/testing/context.fixtures';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import type { WorkspaceMemberProfilesService } from 'src/domain/workspaces/application/services/workspace-member-profiles.service';
import { createRoleMatrix } from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { UpdateWorkspaceMemberRoleCommand } from 'src/domain/workspaces/application/use-cases/update-workspace-member-role/update-workspace-member-role.command';
import { UpdateWorkspaceMemberRoleUseCase } from 'src/domain/workspaces/application/use-cases/update-workspace-member-role/update-workspace-member-role.use-case';
import { WorkspaceLastAdminError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceMember } from 'src/domain/workspaces/domain/workspace-member.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { LocalWorkspaceMembersRepository } from './local-workspace-members.repository';
import { WorkspaceMemberMapper } from './mappers/workspace-member.mapper';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';
import {
  createWorkspaceTestDb,
  dropWorkspaceTestDb,
} from './testing/workspace-db.fixtures';

const orgId = randomUUID();
const anna = randomUUID();
const ben = randomUUID();
const clara = randomUUID();

const profiles = {
  load: (members: WorkspaceMember[]) =>
    Promise.resolve(members.map((member) => ({ member, name: '', email: '' }))),
} as unknown as WorkspaceMemberProfilesService;

describe('Workspace member changes', () => {
  let db: DataSource;
  let schema: string;
  let workspaceId: UUID;

  beforeAll(async () => {
    ({ db, schema } = await createWorkspaceTestDb('ayc1700'));
  }, 30_000);

  afterAll(() => dropWorkspaceTestDb(db, schema), 30_000);

  beforeEach(async () => {
    workspaceId = randomUUID();
    await db.query(
      `INSERT INTO "${schema}".users VALUES ($1), ($2), ($3)
       ON CONFLICT DO NOTHING`,
      [anna, ben, clara],
    );
    await db.query(
      `INSERT INTO "${schema}".workspaces (id, name, icon, color, "orgId")
       VALUES ($1, 'Haushalt 2027', 'folder', 'violet', $2)`,
      [workspaceId, orgId],
    );
  });

  async function transaction(): Promise<QueryRunner> {
    const runner = db.createQueryRunner();
    await runner.startTransaction();
    await runner.query(`SET LOCAL search_path TO "${schema}"`);
    return runner;
  }

  function membersIn(runner: QueryRunner): LocalWorkspaceMembersRepository {
    return new LocalWorkspaceMembersRepository(
      db.getRepository(WorkspaceMemberRecord),
      new WorkspaceMemberMapper(),
      { tx: runner.manager } as never,
    );
  }

  /** The role-change use case acting as `userId` inside `runner`'s transaction. */
  function actingAs(userId: UUID, runner: QueryRunner) {
    const members = membersIn(runner);
    const context = createMockContextService(aUserContext({ userId, orgId }));
    return new UpdateWorkspaceMemberRoleUseCase(
      members,
      new WorkspaceAccessService(
        members,
        createRoleMatrix().getMyPermissions,
        context,
      ),
      profiles,
      context,
    );
  }

  async function seed(userId: UUID, role: UserRole): Promise<void> {
    await db.query(
      `INSERT INTO "${schema}".workspace_members (id, "workspaceId", "userId", role)
       VALUES ($1, $2, $3, $4)`,
      [randomUUID(), workspaceId, userId, role],
    );
  }

  async function committedRoles(): Promise<Record<string, string>> {
    const rows: { userId: string; role: string }[] = await db.query(
      `SELECT "userId", role FROM "${schema}".workspace_members
       WHERE "workspaceId" = $1`,
      [workspaceId],
    );
    return Object.fromEntries(rows.map((row) => [row.userId, row.role]));
  }

  const demote = (userId: UUID) =>
    new UpdateWorkspaceMemberRoleCommand({
      workspaceId,
      userId,
      role: UserRole.USER,
    });

  it('skips users who already are members and keeps their role', async () => {
    await seed(anna, UserRole.ADMIN);
    await seed(ben, UserRole.MANAGER);
    const runner = await transaction();
    try {
      const added = await membersIn(runner).addMany(
        [ben, clara].map(
          (userId) =>
            new WorkspaceMember({ workspaceId, userId, role: UserRole.USER }),
        ),
      );
      await runner.commitTransaction();

      expect(added.map((member) => member.userId)).toEqual([clara]);
      await expect(committedRoles()).resolves.toEqual({
        [anna]: UserRole.ADMIN,
        [ben]: UserRole.MANAGER,
        [clara]: UserRole.USER,
      });
    } finally {
      await runner.release();
    }
  });

  it('keeps an admin when two admins step down at the same time', async () => {
    await seed(anna, UserRole.ADMIN);
    await seed(ben, UserRole.ADMIN);
    const first = await transaction();
    const second = await transaction();
    try {
      await actingAs(anna, first).execute(demote(anna));
      let secondSettled = false;
      const stepDown = actingAs(ben, second)
        .execute(demote(ben))
        .finally(() => {
          secondSettled = true;
        });
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(secondSettled).toBe(false);

      await first.commitTransaction();
      await expect(stepDown).rejects.toBeInstanceOf(WorkspaceLastAdminError);
      await second.rollbackTransaction();

      await expect(committedRoles()).resolves.toEqual({
        [anna]: UserRole.USER,
        [ben]: UserRole.ADMIN,
      });
    } finally {
      await first.release();
      await second.release();
    }
  });

  it('lets an admin who lost the role concurrently change no roles', async () => {
    await seed(anna, UserRole.ADMIN);
    await seed(ben, UserRole.ADMIN);
    await seed(clara, UserRole.USER);
    const first = await transaction();
    const second = await transaction();
    try {
      await actingAs(anna, first).execute(demote(ben));
      const promote = actingAs(ben, second).execute(
        new UpdateWorkspaceMemberRoleCommand({
          workspaceId,
          userId: clara,
          role: UserRole.ADMIN,
        }),
      );
      await first.commitTransaction();
      await expect(promote).rejects.toMatchObject({ statusCode: 403 });
      await second.rollbackTransaction();

      await expect(committedRoles()).resolves.toMatchObject({
        [clara]: UserRole.USER,
      });
    } finally {
      await first.release();
      await second.release();
    }
  });
});
