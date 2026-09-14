import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { OrgSsoConnectionMapper } from 'src/iam/sso/infrastructure/persistence/postgres/mappers/org-sso-connection.mapper';
import { PostgresOrgSsoConnectionsRepository } from 'src/iam/sso/infrastructure/persistence/postgres/org-sso-connections.repository';
import { OrgSsoConnectionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-connection.record';

const connectionSchema = new EntitySchema<OrgSsoConnectionRecord>({
  name: 'OrgSsoConnectionRecord',
  target: OrgSsoConnectionRecord,
  tableName: 'org_sso_connections',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
    orgId: { type: String, unique: true },
    localPasswordLoginEnabled: { type: Boolean, default: true },
  },
});

describe('SSO authentication policy locking', () => {
  let dataSource: DataSource;
  let schemaName: string;
  const orgId = randomUUID();

  beforeAll(async () => {
    schemaName = `ayc_868_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [connectionSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();
    await dataSource.getRepository(OrgSsoConnectionRecord).insert({
      id: randomUUID(),
      orgId,
      localPasswordLoginEnabled: true,
    });
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  it('serializes SSO state mutation ahead of session admission', async () => {
    const writerHost = createTransactionHost(dataSource);
    const readerHost = createTransactionHost(dataSource);
    const writer = createRepository(writerHost);
    const reader = createRepository(readerHost);
    let releaseWriter = (): void => undefined;
    let reportWriterReady = (): void => undefined;
    const writerRelease = new Promise<void>((resolve) => {
      releaseWriter = resolve;
    });
    const writerReady = new Promise<void>((resolve) => {
      reportWriterReady = resolve;
    });

    const mutation = writerHost.withTransaction(async () => {
      await expect(writer.acquireMutationLock(orgId)).resolves.toBe(true);
      reportWriterReady();
      await writerRelease;
    });
    await writerReady;

    try {
      await expect(
        readerHost.withTransaction(async () => {
          await readerHost.tx.query("SET LOCAL lock_timeout = '150ms'");
          return reader.findLocalPasswordLoginEnabledByOrgIdForSessionIssuance(
            orgId,
          );
        }),
      ).rejects.toMatchObject({ driverError: { code: '55P03' } });
    } finally {
      releaseWriter();
      await mutation;
    }

    await expect(
      readerHost.withTransaction(() =>
        reader.findLocalPasswordLoginEnabledByOrgIdForSessionIssuance(orgId),
      ),
    ).resolves.toBe(true);
  });
});

function createRepository(
  txHost: TransactionHost<TransactionalAdapterTypeOrm>,
): PostgresOrgSsoConnectionsRepository {
  return new PostgresOrgSsoConnectionsRepository(
    txHost,
    new OrgSsoConnectionMapper(),
  );
}

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
