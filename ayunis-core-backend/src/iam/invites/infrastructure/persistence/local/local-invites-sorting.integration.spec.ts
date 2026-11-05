import { randomUUID, type UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { SortOrder } from 'src/common/sorting/sort';
import { InvitesSortField } from 'src/iam/invites/domain/invites-sort-field.enum';
import { InviteMapper } from 'src/iam/invites/infrastructure/persistence/local/mappers/invite.mapper';
import { InviteTeamRecord } from 'src/iam/invites/infrastructure/persistence/local/schema/invite-team.record';
import { InviteRecord } from 'src/iam/invites/infrastructure/persistence/local/schema/invite.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { LocalInvitesRepository } from './local-invites.repository';

const teamSchema = new EntitySchema<TeamRecord>({
  name: 'TeamRecord',
  target: TeamRecord,
  tableName: 'teams',
  columns: {
    id: { type: String, primary: true },
    name: { type: String },
    orgId: { type: String, name: 'org_id' },
  },
});

const inviteSchema = new EntitySchema<InviteRecord>({
  name: 'InviteRecord',
  target: InviteRecord,
  tableName: 'invites',
  columns: {
    id: { type: String, primary: true },
    email: { type: String },
    orgId: { type: String },
    role: { type: 'enum', enum: UserRole },
    acceptedAt: { type: 'timestamp', nullable: true },
    expiresAt: { type: 'timestamp' },
    createdAt: { type: 'timestamp' },
    updatedAt: { type: 'timestamp' },
  },
  relations: {
    inviteTeams: {
      type: 'one-to-many',
      target: 'InviteTeamRecord',
      inverseSide: 'invite',
    },
  },
});

const inviteTeamSchema = new EntitySchema<InviteTeamRecord>({
  name: 'InviteTeamRecord',
  target: InviteTeamRecord,
  tableName: 'invite_teams',
  columns: {
    id: { type: String, primary: true },
    inviteId: { type: String, name: 'invite_id' },
    teamId: { type: String, name: 'team_id' },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
  },
  relations: {
    invite: {
      type: 'many-to-one',
      target: 'InviteRecord',
      joinColumn: { name: 'invite_id' },
      inverseSide: 'inviteTeams',
    },
    team: {
      type: 'many-to-one',
      target: 'TeamRecord',
      joinColumn: { name: 'team_id' },
    },
  },
});

// Ids are varchar under the database collation; with hyphens at fixed
// positions that orders the same as comparing the lowercase hex strings.
const byId = (a: string, b: string) => (a < b ? -1 : 1);

describe('LocalInvitesRepository.findByOrgIdPaginated sorting', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let repository: LocalInvitesRepository;
  const orgId = randomUUID();
  let tieIds: UUID[];

  beforeAll(async () => {
    schemaName = `ayc1518_invites_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [teamSchema, inviteSchema, inviteTeamSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();
    repository = new LocalInvitesRepository(new InviteMapper(), {
      tx: dataSource.manager,
    } as unknown as TransactionHost<TransactionalAdapterTypeOrm>);

    const teamIds = [randomUUID(), randomUUID(), randomUUID()];
    for (const [index, id] of teamIds.entries()) {
      await dataSource
        .getRepository(TeamRecord)
        .insert({ id, name: `Team ${index}`, orgId });
    }

    await insertInvite(
      'carla@example.com',
      UserRole.USER,
      '2026-01-01',
      teamIds,
    );
    await insertInvite(
      'anna@example.com',
      UserRole.ADMIN,
      '2026-01-03',
      teamIds,
    );
    await insertInvite('bert@example.com', UserRole.MANAGER, '2026-01-04', []);
    tieIds = [];
    for (let i = 0; i < 3; i++) {
      tieIds.push(
        await insertInvite(
          `dora${i}@example.com`,
          UserRole.USER,
          '2026-01-02',
          teamIds.slice(0, 2),
        ),
      );
    }
    tieIds.sort(byId);
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  async function insertInvite(
    email: string,
    role: UserRole,
    createdAt: string,
    teamIds: UUID[],
  ): Promise<UUID> {
    const id = randomUUID();
    await dataSource.getRepository(InviteRecord).insert({
      id,
      email,
      orgId,
      role,
      expiresAt: new Date('2027-01-01'),
      createdAt: new Date(createdAt),
      updatedAt: new Date(createdAt),
    });
    for (const teamId of teamIds) {
      await dataSource
        .getRepository(InviteTeamRecord)
        .insert({ id: randomUUID(), inviteId: id, teamId });
    }
    return id;
  }

  async function page(
    field: InvitesSortField,
    order: SortOrder,
    offset = 0,
    limit = 10,
  ) {
    const result = await repository.findByOrgIdPaginated(
      orgId,
      { limit, offset },
      {},
      { field, order },
    );
    return result;
  }

  it('sorts by email across the team join without duplicating invites', async () => {
    const { data, total } = await page(InvitesSortField.EMAIL, SortOrder.ASC);

    expect(total).toBe(6);
    expect(data.map((invite) => invite.email)).toEqual([
      'anna@example.com',
      'bert@example.com',
      'carla@example.com',
      'dora0@example.com',
      'dora1@example.com',
      'dora2@example.com',
    ]);
    expect(data[0].teamIds).toHaveLength(3);
  });

  it('sorts by role in declared order', async () => {
    const { data } = await page(InvitesSortField.ROLE, SortOrder.DESC);

    expect(data.map((invite) => invite.role)).toEqual([
      UserRole.USER,
      UserRole.USER,
      UserRole.USER,
      UserRole.USER,
      UserRole.MANAGER,
      UserRole.ADMIN,
    ]);
  });

  it('sorts by sent date', async () => {
    const { data } = await page(InvitesSortField.CREATED_AT, SortOrder.DESC);

    expect(data.map((invite) => invite.email).slice(0, 2)).toEqual([
      'bert@example.com',
      'anna@example.com',
    ]);
    expect(data[data.length - 1].email).toBe('carla@example.com');
  });

  it('applies the sort before pagination and breaks ties by id', async () => {
    const pages = await Promise.all(
      [1, 2, 3].map((offset) =>
        page(InvitesSortField.CREATED_AT, SortOrder.ASC, offset, 1),
      ),
    );

    expect(pages.map(({ data: [invite] }) => invite.id)).toEqual(tieIds);
  });
});
