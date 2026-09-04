import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { LocalUsersRepository } from 'src/iam/users/infrastructure/repositories/local/local-users.repository';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

const userSchema = new EntitySchema<UserRecord>({
  name: 'UserRecord',
  target: UserRecord,
  tableName: 'users',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
    email: { type: String, unique: true },
    emailVerified: { type: Boolean, default: false },
    name: { type: String },
    passwordHash: { type: String, nullable: true },
    role: { type: String },
    systemRole: { type: String, default: SystemRole.CUSTOMER },
    orgId: { type: String },
    hasAcceptedMarketing: { type: Boolean, default: false },
    department: { type: String, nullable: true },
    failedLoginAttempts: { type: Number, default: 0 },
    failedLoginWindowStartedAt: { type: 'timestamptz', nullable: true },
    lockedAt: { type: 'timestamptz', nullable: true },
  },
});

describe('SSO user policy persistence', () => {
  let dataSource: DataSource;
  let repository: LocalUsersRepository;
  let schemaName: string;
  const orgId = randomUUID();
  const userId = randomUUID();

  beforeAll(async () => {
    schemaName = `ayc_868_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [userSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();
    repository = new LocalUsersRepository(createTransactionHost(dataSource));
  });

  beforeEach(async () => {
    await dataSource.getRepository(UserRecord).save({
      id: userId,
      email: 'staff@stadt.example',
      emailVerified: false,
      name: 'Erika Mustermann',
      passwordHash: null,
      role: UserRole.USER,
      systemRole: SystemRole.CUSTOMER,
      orgId,
      hasAcceptedMarketing: false,
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedAt: null,
    });
  });

  afterEach(async () => {
    await dataSource.getRepository(UserRecord).delete({ id: userId });
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  it('verifies only the broker-matching email and reports password capability', async () => {
    await expect(repository.hasPasswordlessUsers(orgId)).resolves.toBe(true);
    await expect(
      verifyEmailInTransaction('different@stadt.example'),
    ).resolves.toBeNull();

    await expect(
      verifyEmailInTransaction('STAFF@STADT.EXAMPLE'),
    ).resolves.toMatchObject({
      changed: true,
      user: { id: userId, emailVerified: true },
    });
    await expect(
      verifyEmailInTransaction('staff@stadt.example'),
    ).resolves.toMatchObject({ changed: false });

    await dataSource
      .getRepository(UserRecord)
      .update({ id: userId }, { passwordHash: 'password-hash' });
    await expect(repository.hasPasswordlessUsers(orgId)).resolves.toBe(false);
  });

  function verifyEmailInTransaction(email: string) {
    return dataSource.transaction((manager) =>
      new LocalUsersRepository({ tx: manager } as never).verifyEmailIfMatches(
        userId,
        email,
      ),
    );
  }
});

function createTransactionHost(
  dataSource: DataSource,
): TransactionHost<TransactionalAdapterTypeOrm> {
  const adapter = new TransactionalAdapterTypeOrm({
    dataSourceToken: DataSource,
  });
  return new TransactionHost<TransactionalAdapterTypeOrm>({
    ...adapter.optionsFactory(dataSource),
    connectionName: undefined,
    enableTransactionProxy: false,
    defaultTxOptions: {},
    extraProviderTokens: [],
  });
}
