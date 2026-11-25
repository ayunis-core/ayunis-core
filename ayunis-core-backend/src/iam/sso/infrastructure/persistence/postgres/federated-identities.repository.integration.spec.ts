import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { PostgresFederatedIdentitiesRepository } from 'src/iam/sso/infrastructure/persistence/postgres/federated-identities.repository';
import { FederatedIdentityMapper } from 'src/iam/sso/infrastructure/persistence/postgres/mappers/federated-identity.mapper';
import { FederatedIdentityRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/federated-identity.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

const ISSUER = 'https://sso.ayunis.de';
const FORMER_ISSUER = 'https://sso-old.ayunis.de';

const userSchema = new EntitySchema<UserRecord>({
  name: 'UserRecord',
  target: UserRecord,
  tableName: 'users',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
    orgId: { type: String },
  },
});

const identitySchema = new EntitySchema<FederatedIdentityRecord>({
  name: 'FederatedIdentityRecord',
  target: FederatedIdentityRecord,
  tableName: 'federated_identities',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
    issuer: { type: String },
    subject: { type: String },
    userId: { type: String },
  },
  relations: {
    user: {
      type: 'many-to-one',
      target: 'UserRecord',
      joinColumn: { name: 'userId' },
    },
  },
});

describe('PostgresFederatedIdentitiesRepository subject lookups', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let repository: PostgresFederatedIdentitiesRepository;
  const orgId = randomUUID();
  const otherOrgId = randomUUID();
  const userId = randomUUID();
  const colleagueId = randomUUID();
  const otherOrgUserId = randomUUID();

  beforeAll(async () => {
    schemaName = `ayc_1511_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [userSchema, identitySchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();
    await seed();
    repository = new PostgresFederatedIdentitiesRepository(
      createTransactionHost(dataSource),
      new FederatedIdentityMapper(),
    );
  }, 30_000);

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  }, 30_000);

  async function seed(): Promise<void> {
    await dataSource.getRepository(UserRecord).insert([
      { id: userId, orgId },
      { id: colleagueId, orgId },
      { id: otherOrgUserId, orgId: otherOrgId },
    ]);
    const identity = (subject: string, owner: UUID, issuer = ISSUER) => ({
      id: randomUUID(),
      issuer,
      subject,
      userId: owner,
    });
    await dataSource
      .getRepository(FederatedIdentityRecord)
      .insert([
        identity('user-subject', userId),
        identity('former-issuer-subject', userId, FORMER_ISSUER),
        identity('colleague-subject', colleagueId),
        identity('other-org-subject', otherOrgUserId),
      ]);
  }

  it('returns only the subjects of the organization being deleted', async () => {
    const subjects = await repository.findSubjectsByOrgId(orgId, ISSUER);

    expect(subjects).toHaveLength(2);
    expect(subjects).toEqual(
      expect.arrayContaining(['colleague-subject', 'user-subject']),
    );
  });

  it('returns only the deleted user’s subjects at the configured issuer', async () => {
    await expect(
      repository.findSubjectsByUserId(userId, ISSUER),
    ).resolves.toEqual(['user-subject']);
  });

  it('reports a subject as linked only at the issuer it was linked at', async () => {
    await expect(
      repository.findLinkedSubjects(ISSUER, [
        'user-subject',
        'former-issuer-subject',
        'never-linked-subject',
      ]),
    ).resolves.toEqual(['user-subject']);
  });
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
