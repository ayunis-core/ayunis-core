import 'src/config/env';
import { FynnOrgLinkRecord } from 'src/integrations/fynn/infrastructure/persistence/schema/fynn-org-link.record';
import { PostgresFynnOrgLinkRepository } from 'src/integrations/fynn/infrastructure/persistence/postgres-fynn-org-link.repository';
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

const linkSchema = new EntitySchema<FynnOrgLinkRecord>({
  name: 'FynnOrgLinkRecord',
  target: FynnOrgLinkRecord,
  tableName: 'fynn_org_links',
  columns: {
    orgId: { type: String, primary: true },
    customerId: { type: String },
  },
});

describe('Fynn synchronization persistence boundaries', () => {
  let db: DataSource;
  let schema: string;
  let tx: TransactionHost<TransactionalAdapterTypeOrm>;
  let addons: PostgresOrgAddonRepository;
  let trials: LocalTrialsRepository;
  let links: PostgresFynnOrgLinkRepository;
  beforeAll(async () => {
    schema = `fynn_sync_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [addonSchema, trialSchema, linkSchema],
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
        PostgresFynnOrgLinkRepository,
        { provide: TransactionHost, useValue: tx },
        {
          provide: getRepositoryToken(OrgAddonRecord),
          useValue: db.getRepository(OrgAddonRecord),
        },
      ],
    }).compile();
    addons = module.get(PostgresOrgAddonRepository);
    trials = module.get(LocalTrialsRepository);
    links = module.get(PostgresFynnOrgLinkRepository);
  });
  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  });
  it('rolls back link tracking together with Academy activation', async () => {
    const orgId = randomUUID();
    await expect(
      tx.withTransaction(async () => {
        await links.save({ orgId, customerId: 'fynn-customer-3' });
        await addons.create(
          new OrgAddon({ orgId, type: AddonType.AYUNIS_CORE_ACADEMY }),
        );
        throw new Error('later synchronization failed');
      }),
    ).rejects.toThrow();
    expect(await links.findByOrgId(orgId)).toBeNull();
    expect(await addons.findAllByOrgId(orgId)).toEqual([]);
  });
  it('rolls back link deletion and Academy revocation together', async () => {
    const orgId = randomUUID();
    const addon = await addons.create(
      new OrgAddon({ orgId, type: AddonType.AYUNIS_CORE_ACADEMY }),
    );
    await links.save({ orgId, customerId: 'fynn-customer-3' });
    await expect(
      tx.withTransaction(async () => {
        await addons.delete(addon.id);
        await links.delete(orgId);
        throw new Error('later cleanup failed');
      }),
    ).rejects.toThrow();
    expect(await links.findByOrgId(orgId)).toMatchObject({
      customerId: 'fynn-customer-3',
    });
    expect(await addons.findAllByOrgId(orgId)).toHaveLength(1);
  });
  it('keeps one current customer per org without preventing a customer move', async () => {
    const first = randomUUID(),
      second = randomUUID();
    await links.save({ orgId: first, customerId: 'first-customer' });
    await links.save({ orgId: first, customerId: 'replacement-customer' });
    await links.save({ orgId: second, customerId: 'replacement-customer' });
    expect(await links.findAll('first-customer')).toEqual([]);
    expect(
      (await links.findAll('replacement-customer'))
        .map((link) => link.orgId)
        .sort((left, right) => left.localeCompare(right)),
    ).toEqual([first, second].sort((left, right) => left.localeCompare(right)));
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
