import { randomUUID } from 'crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';
import { LocalLetterheadsRepository } from './local-letterheads.repository';
import { LetterheadMapper } from './mappers/letterhead.mapper';
import { LetterheadRecord } from './schema/letterhead.record';

const letterheadSchema = new EntitySchema<LetterheadRecord>({
  name: 'LetterheadRecord',
  target: LetterheadRecord,
  tableName: 'letterheads',
  columns: {
    id: { type: 'uuid', primary: true },
    orgId: { type: 'uuid' },
    name: { type: String },
    description: { type: String, nullable: true },
    firstPageStoragePath: { type: String },
    continuationPageStoragePath: { type: String, nullable: true },
    firstPageMargins: { type: 'simple-json' },
    continuationPageMargins: { type: 'simple-json' },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
  },
});

describe('LocalLetterheadsRepository concurrent updates', () => {
  let db: DataSource;
  let schema: string;
  let repository: LocalLetterheadsRepository;

  beforeAll(async () => {
    schema = `ayc35_letterheads_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [letterheadSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    repository = new LocalLetterheadsRepository(
      db.getRepository(LetterheadRecord),
      new LetterheadMapper(),
      createTransactionHost(db),
    );
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  });

  it('rejects a stale replacement and preserves the winning storage path', async () => {
    const original = letterhead();
    await repository.save(original);
    const firstReader = await repository.findById(original.orgId, original.id);
    const staleReader = await repository.findById(original.orgId, original.id);
    expect(firstReader).not.toBeNull();
    expect(staleReader).not.toBeNull();
    if (!firstReader || !staleReader) return;

    const winner = replacement(firstReader, 'winner.pdf');
    const stale = replacement(staleReader, 'stale.pdf');

    await expect(
      repository.updateIfUnchanged(winner, firstReader.updatedAt),
    ).resolves.toEqual(winner);
    await expect(
      repository.updateIfUnchanged(stale, staleReader.updatedAt),
    ).resolves.toBeNull();
    await expect(
      repository.findById(original.orgId, original.id),
    ).resolves.toMatchObject({ firstPageStoragePath: 'winner.pdf' });
  });
});

function createTransactionHost(
  db: DataSource,
): TransactionHost<TransactionalAdapterTypeOrm> {
  const adapter = new TransactionalAdapterTypeOrm({
    dataSourceToken: DataSource,
  });
  return new TransactionHost<TransactionalAdapterTypeOrm>({
    ...adapter.optionsFactory(db),
    connectionName: undefined,
    enableTransactionProxy: false,
    defaultTxOptions: {},
    extraProviderTokens: [],
  });
}

function letterhead(): Letterhead {
  const orgId = randomUUID();
  const id = randomUUID();
  return new Letterhead({
    id,
    orgId,
    name: 'Municipality letterhead',
    firstPageStoragePath: 'original.pdf',
    firstPageMargins: { top: 20, right: 20, bottom: 20, left: 20 },
    continuationPageMargins: { top: 20, right: 20, bottom: 20, left: 20 },
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

function replacement(current: Letterhead, path: string): Letterhead {
  return new Letterhead({
    ...current,
    firstPageStoragePath: path,
    updatedAt: new Date(current.updatedAt.getTime() + 1),
  });
}
