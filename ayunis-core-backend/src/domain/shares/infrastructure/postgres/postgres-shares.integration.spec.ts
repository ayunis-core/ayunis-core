import { randomUUID } from 'crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import type { Share } from 'src/domain/shares/domain/share.entity';
import { PostgresSharesRepository } from './postgres-shares.repository';
import { ShareRecord } from './schema/share.record';
import { ShareScopeRecord } from './schema/share-scope.record';
import type { ShareMapper } from './mappers/share.mapper';

const scopeSchema = new EntitySchema<ShareScopeRecord>({
  name: 'ShareScopeRecord',
  target: ShareScopeRecord,
  tableName: 'scopes',
  columns: { id: { type: 'uuid', primary: true } },
});
const shareSchema = new EntitySchema<ShareRecord>({
  name: 'ShareRecord',
  target: ShareRecord,
  tableName: 'shares',
  columns: { id: { type: 'uuid', primary: true } },
  relations: {
    scope: {
      type: 'many-to-one',
      target: 'ShareScopeRecord',
      joinColumn: { name: 'scope_id' },
    },
  },
});

describe('Share and scope deletion transaction', () => {
  let db: DataSource;
  let schema: string;
  let txHost: TransactionHost<TransactionalAdapterTypeOrm>;
  let repository: PostgresSharesRepository;
  let shareId: ReturnType<typeof randomUUID>;
  let scopeId: ReturnType<typeof randomUUID>;

  beforeAll(async () => {
    schema = `ayc496_shares_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [shareSchema, scopeSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    configureRepository();
  });

  function configureRepository(): void {
    const adapter = new TransactionalAdapterTypeOrm({
      dataSourceToken: DataSource,
    });
    txHost = new TransactionHost<TransactionalAdapterTypeOrm>({
      ...adapter.optionsFactory(db),
      connectionName: undefined,
      enableTransactionProxy: false,
      defaultTxOptions: {},
      extraProviderTokens: [],
    });
    repository = new PostgresSharesRepository(
      db.getRepository(ShareRecord),
      db.getRepository(ShareScopeRecord),
      {} as ShareMapper,
      txHost,
    );
  }

  beforeEach(async () => {
    shareId = randomUUID();
    scopeId = randomUUID();
    await db.getRepository(ShareScopeRecord).insert({ id: scopeId });
    await db
      .getRepository(ShareRecord)
      .insert({ id: shareId, scope: { id: scopeId } });
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  });

  async function remainingRows(): Promise<number[]> {
    return Promise.all([
      db.getRepository(ShareRecord).countBy({ id: shareId }),
      db.getRepository(ShareScopeRecord).countBy({ id: scopeId }),
    ]);
  }

  it('preserves the share when its scope cannot be deleted', async () => {
    await db.query(`CREATE FUNCTION "${schema}".reject_scope_delete()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'scope delete failed'; END; $$`);
    await db.query(`CREATE TRIGGER reject_scope_delete BEFORE DELETE
      ON "${schema}".scopes FOR EACH ROW
      EXECUTE FUNCTION "${schema}".reject_scope_delete()`);
    try {
      await expect(
        txHost.withTransaction(() =>
          repository.delete({ id: shareId } as Share),
        ),
      ).rejects.toThrow('scope delete failed');
      expect(await remainingRows()).toEqual([1, 1]);
    } finally {
      await db.query(`DROP TRIGGER reject_scope_delete ON "${schema}".scopes`);
      await db.query(`DROP FUNCTION "${schema}".reject_scope_delete()`);
    }
  });

  it('commits both removals together', async () => {
    await txHost.withTransaction(() =>
      repository.delete({ id: shareId } as Share),
    );
    expect(await remainingRows()).toEqual([0, 0]);
  });
});
