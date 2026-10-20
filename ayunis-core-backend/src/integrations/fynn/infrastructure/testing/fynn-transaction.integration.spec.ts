import 'src/config/env';
import { randomUUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { PostgresOrgAddonRepository } from 'src/iam/addons/infrastructure/persistence/postgres/org-addon.repository';
import { OrgAddonRecord } from 'src/iam/addons/infrastructure/persistence/postgres/schema/org-addon.record';
import { OrgAddon } from 'src/iam/addons/domain/org-addon.entity';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';
import { LocalTrialsRepository } from 'src/iam/trials/infrastructure/persistence/local/local-trials.repository';
import { TrialRecord } from 'src/iam/trials/infrastructure/persistence/local/schema/trial.record';
import { Trial } from 'src/iam/trials/domain/trial.entity';

const addonSchema = new EntitySchema<OrgAddonRecord>({
  name: 'OrgAddonRecord',
  target: OrgAddonRecord,
  tableName: 'addons',
  columns: {
    id: { type: 'uuid', primary: true },
    orgId: { type: 'uuid' },
    type: { type: String },
    createdAt: { type: 'timestamp' },
    updatedAt: { type: 'timestamp' },
  },
});
const trialSchema = new EntitySchema<TrialRecord>({
  name: 'TrialRecord',
  target: TrialRecord,
  tableName: 'trials',
  columns: {
    id: { type: 'uuid', primary: true },
    orgId: { type: 'uuid' },
    messagesSent: { type: Number },
    maxMessages: { type: Number },
    createdAt: { type: 'timestamp' },
    updatedAt: { type: 'timestamp' },
  },
});

describe('Fynn synchronization persistence boundaries', () => {
  let db: DataSource;
  let schema: string;
  let tx: TransactionHost<TransactionalAdapterTypeOrm>;
  let addons: PostgresOrgAddonRepository;
  let trials: LocalTrialsRepository;
  beforeAll(async () => {
    schema = `fynn_sync_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [addonSchema, trialSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    const adapter = new TransactionalAdapterTypeOrm({
      dataSourceToken: DataSource,
    });
    tx = new TransactionHost<TransactionalAdapterTypeOrm>({
      ...adapter.optionsFactory(db),
      connectionName: undefined,
      enableTransactionProxy: false,
      defaultTxOptions: {},
      extraProviderTokens: [],
    });
    const module = await Test.createTestingModule({
      providers: [
        PostgresOrgAddonRepository,
        LocalTrialsRepository,
        { provide: TransactionHost, useValue: tx },
        {
          provide: getRepositoryToken(OrgAddonRecord),
          useValue: db.getRepository(OrgAddonRecord),
        },
      ],
    }).compile();
    addons = module.get(PostgresOrgAddonRepository);
    trials = module.get(LocalTrialsRepository);
  });
  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  });
  it('rolls back Academy activation when the surrounding sync fails', async () => {
    const orgId = randomUUID();
    await expect(
      tx.withTransaction(async () => {
        await addons.create(
          new OrgAddon({ orgId, type: AddonType.AYUNIS_CORE_ACADEMY }),
        );
        throw new Error('later synchronization failed');
      }),
    ).rejects.toThrow('later synchronization failed');
    expect(await addons.findAllByOrgId(orgId)).toEqual([]);
  });
  it('rolls back Academy deactivation when the surrounding sync fails', async () => {
    const addon = await addons.create(
      new OrgAddon({
        orgId: randomUUID(),
        type: AddonType.AYUNIS_CORE_ACADEMY,
      }),
    );
    await expect(
      tx.withTransaction(async () => {
        await addons.delete(addon.id);
        throw new Error('later synchronization failed');
      }),
    ).rejects.toThrow();
    expect(await addons.findAllByOrgId(addon.orgId)).toHaveLength(1);
  });
  it('ends a trial using its current counter without overwriting a completed increment', async () => {
    const orgId = randomUUID();
    await trials.create(
      new Trial({ orgId, messagesSent: 7, maxMessages: 100 }),
    );
    const writer = db.createQueryRunner();
    await writer.startTransaction();
    await writer.manager
      .getRepository(TrialRecord)
      .increment({ orgId }, 'messagesSent', 1);
    try {
      const end = trials.endRemainingAllowance(orgId);
      await writer.commitTransaction();
      expect(await end).toBe(true);
    } finally {
      if (writer.isTransactionActive) await writer.rollbackTransaction();
      await writer.release();
    }
    expect(await trials.findByOrgId(orgId)).toMatchObject({
      messagesSent: 8,
      maxMessages: 8,
    });
    expect(await trials.endRemainingAllowance(orgId)).toBe(false);
  });
  it('rolls back trial exhaustion when the surrounding sync fails', async () => {
    const orgId = randomUUID();
    await trials.create(
      new Trial({ orgId, messagesSent: 7, maxMessages: 100 }),
    );
    await expect(
      tx.withTransaction(async () => {
        await trials.endRemainingAllowance(orgId);
        throw new Error('later synchronization failed');
      }),
    ).rejects.toThrow();
    expect(await trials.findByOrgId(orgId)).toMatchObject({
      messagesSent: 7,
      maxMessages: 100,
    });
  });
});
