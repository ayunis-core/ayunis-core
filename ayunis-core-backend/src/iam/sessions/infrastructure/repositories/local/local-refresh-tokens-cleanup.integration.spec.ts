import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntitySchema, In } from 'typeorm';
import type { Logger as TypeOrmLogger } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import {
  EXPIRED_TOKEN_DELETE_BATCH_SIZE,
  LocalRefreshTokensRepository,
} from './local-refresh-tokens.repository';
import { RefreshTokenRecord } from './schema/refresh-token.record';
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
  relations: {
    replacedByToken: {
      type: 'many-to-one',
      target: 'RefreshTokenRecord',
      joinColumn: { name: 'replacedByTokenId' },
      nullable: true,
      onDelete: 'SET NULL',
    },
  },
});

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRED_COUNT = 2 * EXPIRED_TOKEN_DELETE_BATCH_SIZE + 500;
const LIVE_COUNT = 50;
const LIVE_WITH_EXPIRED_SUCCESSOR = 10;
const INSERT_CHUNK = 500;

type TokenRow = Pick<
  RefreshTokenRecord,
  'id' | 'userId' | 'familyId' | 'tokenHash' | 'expiresAt' | 'replacedByTokenId'
>;

function buildTokens(count: number, expiresAt: Date): TokenRow[] {
  return Array.from({ length: count }, () => {
    const id = randomUUID();
    return {
      id,
      userId: randomUUID(),
      familyId: randomUUID(),
      tokenHash: `hash-${id}`,
      expiresAt,
      replacedByTokenId: null,
    };
  });
}

function createDeleteCounter(): { logger: TypeOrmLogger; count: () => number } {
  let deletes = 0;
  const noop = (): void => undefined;
  return {
    count: () => deletes,
    logger: {
      logQuery: (query: string) => {
        if (/^\s*DELETE/i.test(query)) deletes += 1;
      },
      logQueryError: noop,
      logQuerySlow: noop,
      logSchemaBuild: noop,
      logMigration: noop,
      log: noop,
    },
  };
}

describe('Expired refresh token cleanup', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let repository: LocalRefreshTokensRepository;
  const deletes = createDeleteCounter();

  beforeAll(async () => {
    schemaName = `refresh_cleanup_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [refreshTokenSchema],
      migrations: [],
      migrationsRun: false,
      logging: ['query'],
      logger: deletes.logger,
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();
    repository = new LocalRefreshTokensRepository(
      dataSource.getRepository(RefreshTokenRecord),
      createTransactionHost(dataSource),
    );
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  async function insertRows(rows: TokenRow[]): Promise<void> {
    const records = dataSource.getRepository(RefreshTokenRecord);
    for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
      await records.insert(rows.slice(start, start + INSERT_CHUNK));
    }
  }

  it('removes the expired backlog in bounded batches and keeps live rows', async () => {
    const now = new Date();
    const expiredAt = new Date(now.getTime() - DAY_MS);
    const liveUntil = new Date(now.getTime() + 7 * DAY_MS);
    const expiredSuccessors = buildTokens(EXPIRED_COUNT / 2, expiredAt);
    const expiredPredecessors = buildTokens(EXPIRED_COUNT / 2, expiredAt).map(
      (row, index) => ({
        ...row,
        replacedByTokenId: expiredSuccessors[index].id,
      }),
    );
    const live = buildTokens(LIVE_COUNT, liveUntil).map((row, index) => ({
      ...row,
      replacedByTokenId:
        index < LIVE_WITH_EXPIRED_SUCCESSOR
          ? expiredSuccessors[index].id
          : null,
    }));
    await insertRows(expiredSuccessors);
    await insertRows(expiredPredecessors);
    await insertRows(live);
    const records = dataSource.getRepository(RefreshTokenRecord);
    const liveIds = live.map((row) => row.id);
    const referencing = await records.findBy({
      id: In(liveIds.slice(0, LIVE_WITH_EXPIRED_SUCCESSOR)),
    });
    expect(referencing.map((row) => row.replacedByTokenId)).not.toContain(null);

    const deletesBefore = deletes.count();
    const deleted = await repository.deleteExpired(now);

    expect(deleted).toBe(EXPIRED_COUNT);
    expect(deletes.count() - deletesBefore).toBe(
      Math.floor(EXPIRED_COUNT / EXPIRED_TOKEN_DELETE_BATCH_SIZE) + 1,
    );
    const remaining = await records.find();
    expect(
      remaining.map((row) => row.id).sort((a, b) => a.localeCompare(b)),
    ).toEqual([...liveIds].sort((a, b) => a.localeCompare(b)));
    expect(remaining.every((row) => row.expiresAt > now)).toBe(true);
    expect(remaining.every((row) => row.replacedByTokenId === null)).toBe(true);
  });

  it('returns zero and issues one statement when nothing is expired', async () => {
    const deletesBefore = deletes.count();

    const deleted = await repository.deleteExpired(new Date());

    expect(deleted).toBe(0);
    expect(deletes.count() - deletesBefore).toBe(1);
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
