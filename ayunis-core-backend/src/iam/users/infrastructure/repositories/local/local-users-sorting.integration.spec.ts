import { randomUUID, type UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { SortOrder } from 'src/common/sorting/sort';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { OrgUsersSortField } from 'src/iam/users/domain/value-objects/org-users-sort.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SuperAdminUsersSortField } from 'src/iam/users/domain/value-objects/super-admin-users-sort.enum';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { LocalUsersRepository } from './local-users.repository';

const orgSchema = new EntitySchema<OrgRecord>({
  name: 'OrgRecord',
  target: OrgRecord,
  tableName: 'orgs',
  columns: {
    id: { type: String, primary: true },
    name: { type: String },
  },
});

const userSchema = new EntitySchema<UserRecord>({
  name: 'UserRecord',
  target: UserRecord,
  tableName: 'users',
  columns: {
    id: { type: String, primary: true },
    name: { type: String },
    email: { type: String },
    role: { type: 'enum', enum: UserRole },
    orgId: { type: String },
    createdAt: { type: 'timestamp' },
    updatedAt: { type: 'timestamp' },
  },
  relations: {
    org: {
      type: 'many-to-one',
      target: 'OrgRecord',
      joinColumn: { name: 'orgId' },
    },
  },
});

// Ids are varchar under the database collation; with hyphens at fixed
// positions that orders the same as comparing the lowercase hex strings.
const byId = (a: string, b: string) => (a < b ? -1 : 1);

describe('LocalUsersRepository sorting', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let repository: LocalUsersRepository;
  let alphaOrg: UUID;
  let tieIds: UUID[];

  beforeAll(async () => {
    schemaName = `ayc1518_sort_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [orgSchema, userSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();
    repository = new LocalUsersRepository({
      tx: dataSource.manager,
    } as unknown as TransactionHost<TransactionalAdapterTypeOrm>);

    const zetaOrg = await insertOrg('Zeta Gemeinde');
    alphaOrg = await insertOrg('Alpha Stadt');
    await insertUser('Bert', 'bert@example.com', alphaOrg, '2026-01-02', {
      role: UserRole.ADMIN,
    });
    await insertUser('Anna', 'zz-anna@example.com', zetaOrg, '2026-01-04');
    await insertUser('Carla', 'carla@example.com', zetaOrg, '2026-01-01');
    await insertUser('Emil', 'emil@example.com', alphaOrg, '2026-01-02', {
      role: UserRole.MANAGER,
    });
    tieIds = [];
    for (let i = 0; i < 3; i++) {
      tieIds.push(
        await insertUser(
          'Dora',
          `dora${i}@example.com`,
          alphaOrg,
          '2026-01-03',
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

  async function insertOrg(name: string): Promise<UUID> {
    const id = randomUUID();
    await dataSource.getRepository(OrgRecord).insert({ id, name });
    return id;
  }

  async function insertUser(
    name: string,
    email: string,
    orgId: UUID,
    createdAt: string,
    { role = UserRole.USER }: { role?: UserRole } = {},
  ): Promise<UUID> {
    const id = randomUUID();
    await dataSource.getRepository(UserRecord).insert({
      id,
      name,
      email,
      role,
      orgId,
      createdAt: new Date(createdAt),
      updatedAt: new Date(createdAt),
    });
    return id;
  }

  describe('findAllForSuperAdmin', () => {
    async function page(
      field: SuperAdminUsersSortField,
      order: SortOrder,
      offset = 0,
      limit = 10,
    ) {
      const result = await repository.findAllForSuperAdmin(
        { limit, offset },
        {},
        { field, order },
      );
      return result.data;
    }

    it('sorts by name ascending and descending', async () => {
      const asc = await page(SuperAdminUsersSortField.NAME, SortOrder.ASC);
      const desc = await page(SuperAdminUsersSortField.NAME, SortOrder.DESC);

      expect(asc.map((item) => item.user.name)).toEqual([
        'Anna',
        'Bert',
        'Carla',
        'Dora',
        'Dora',
        'Dora',
        'Emil',
      ]);
      expect(desc.map((item) => item.user.name)).toEqual([
        'Emil',
        'Dora',
        'Dora',
        'Dora',
        'Carla',
        'Bert',
        'Anna',
      ]);
    });

    it('sorts by email', async () => {
      const asc = await page(SuperAdminUsersSortField.EMAIL, SortOrder.ASC);

      expect(asc.map((item) => item.user.email)).toEqual([
        'bert@example.com',
        'carla@example.com',
        'dora0@example.com',
        'dora1@example.com',
        'dora2@example.com',
        'emil@example.com',
        'zz-anna@example.com',
      ]);
    });

    it('sorts by organization name across the joined org', async () => {
      const desc = await page(
        SuperAdminUsersSortField.ORG_NAME,
        SortOrder.DESC,
      );

      expect(desc.map((item) => item.orgName)).toEqual([
        ...Array<string>(2).fill('Zeta Gemeinde'),
        ...Array<string>(5).fill('Alpha Stadt'),
      ]);
    });

    it('sorts by creation date', async () => {
      const desc = await page(
        SuperAdminUsersSortField.CREATED_AT,
        SortOrder.DESC,
      );

      expect(desc[0].user.name).toBe('Anna');
      expect(desc[desc.length - 1].user.name).toBe('Carla');
    });

    it('applies the sort before pagination', async () => {
      const secondPage = await page(
        SuperAdminUsersSortField.NAME,
        SortOrder.ASC,
        2,
        2,
      );

      expect(secondPage.map((item) => item.user.name)).toEqual([
        'Carla',
        'Dora',
      ]);
    });

    it('breaks ties by id so equal values never move between pages', async () => {
      const pages = await Promise.all(
        [3, 4, 5].map((offset) =>
          page(SuperAdminUsersSortField.NAME, SortOrder.ASC, offset, 1),
        ),
      );

      expect(pages.map(([item]) => item.user.id)).toEqual(tieIds);
    });
  });

  describe('findManyByOrgId', () => {
    async function page(
      field: OrgUsersSortField,
      order: SortOrder,
      offset = 0,
      limit = 10,
    ) {
      const result = await repository.findManyByOrgId(
        alphaOrg,
        { limit, offset },
        {},
        { field, order },
      );
      return result.data;
    }

    it('sorts only the org members by name', async () => {
      const asc = await page(OrgUsersSortField.NAME, SortOrder.ASC);

      expect(asc.map((user) => user.name)).toEqual([
        'Bert',
        'Dora',
        'Dora',
        'Dora',
        'Emil',
      ]);
    });

    it('sorts by role in declared order (admin, manager, user)', async () => {
      const asc = await page(OrgUsersSortField.ROLE, SortOrder.ASC);
      const desc = await page(OrgUsersSortField.ROLE, SortOrder.DESC);

      expect(asc.map((user) => user.role)).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.USER,
        UserRole.USER,
        UserRole.USER,
      ]);
      expect(desc.map((user) => user.role)).toEqual([
        UserRole.USER,
        UserRole.USER,
        UserRole.USER,
        UserRole.MANAGER,
        UserRole.ADMIN,
      ]);
    });

    it('breaks ties by id in the sort direction across pages', async () => {
      const ascPages = await Promise.all(
        [1, 2, 3].map((offset) =>
          page(OrgUsersSortField.NAME, SortOrder.ASC, offset, 1),
        ),
      );
      const descPages = await Promise.all(
        [1, 2, 3].map((offset) =>
          page(OrgUsersSortField.NAME, SortOrder.DESC, offset, 1),
        ),
      );

      expect(ascPages.map(([user]) => user.id)).toEqual(tieIds);
      expect(descPages.map(([user]) => user.id)).toEqual([...tieIds].reverse());
    });
  });
});
