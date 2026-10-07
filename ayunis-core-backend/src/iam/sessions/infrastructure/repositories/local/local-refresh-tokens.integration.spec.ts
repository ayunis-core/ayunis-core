import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { LocalRefreshTokensRepository } from 'src/iam/sessions/infrastructure/repositories/local/local-refresh-tokens.repository';
import { RefreshTokenRecord } from 'src/iam/sessions/infrastructure/repositories/local/schema/refresh-token.record';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

const refreshTokenSchema = new EntitySchema<RefreshTokenRecord>({
  name: 'RefreshTokenRecord',
  target: RefreshTokenRecord,
  tableName: 'refresh_tokens',
  columns: {
    id: { type: 'uuid', primary: true },
    userId: { type: 'uuid' },
    familyId: { type: 'uuid' },
    tokenHash: { type: String, unique: true },
    authenticationMethod: {
      type: 'enum',
      enum: SessionAuthenticationMethod,
      default: SessionAuthenticationMethod.PASSWORD,
    },
    zitadelSessionId: { type: 'varchar', nullable: true },
    familyExpiresAt: { type: 'timestamptz', nullable: true },
    expiresAt: { type: 'timestamptz' },
    usedAt: { type: 'timestamptz', nullable: true },
    revokedAt: { type: 'timestamptz', nullable: true },
    replacedByTokenId: { type: 'uuid', nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
});

// A refresh holds one pooled connection for its transaction. Reads that take
// a second connection starve the pool when parallel requests all refresh at
// once (AppSignal internal #215-#221), so a single-connection pool proves the
// reads stay on the transaction's connection.
describe('Refresh token reads inside a transaction', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let txHost: TransactionHost<TransactionalAdapterTypeOrm>;
  let repository: LocalRefreshTokensRepository;
  const tokenId = randomUUID();
  const tokenHash = `hash-${tokenId}`;

  beforeAll(async () => {
    schemaName = `refresh_pool_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [refreshTokenSchema],
      migrations: [],
      migrationsRun: false,
      poolSize: 1,
      extra: { connectionTimeoutMillis: 1000 },
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();
    txHost = createTransactionHost(dataSource);
    repository = new LocalRefreshTokensRepository(
      dataSource.getRepository(RefreshTokenRecord),
      txHost,
    );
  });

  beforeEach(async () => {
    await dataSource.getRepository(RefreshTokenRecord).save({
      id: tokenId,
      userId: randomUUID(),
      familyId: randomUUID(),
      tokenHash,
      authenticationMethod: SessionAuthenticationMethod.PASSWORD,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      usedAt: new Date(),
    });
  });

  afterEach(async () => {
    await dataSource.getRepository(RefreshTokenRecord).delete({ id: tokenId });
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  it('finds a token by hash without a second pooled connection', async () => {
    const found = await txHost.withTransaction(() =>
      repository.findByTokenHash(tokenHash),
    );

    expect(found?.id).toBe(tokenId);
  });

  it('checks the concurrent-refresh grace period without a second pooled connection', async () => {
    const withinGrace = await txHost.withTransaction(() =>
      repository.wasUsedWithinGrace(tokenId, 60),
    );

    expect(withinGrace).toBe(true);
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
