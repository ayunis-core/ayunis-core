import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { Connector } from 'src/domain/connectors/domain/connector.entity';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import { ConnectorStatus } from 'src/domain/connectors/domain/connector-status.enum';
import { ConnectorMapper } from './mappers/connector.mapper';
import { ConnectorRecord } from './schema/connector.record';
import { LocalConnectorsRepository } from './local-connectors.repository';

const connectorSchema = new EntitySchema<ConnectorRecord>({
  name: 'ConnectorRecord',
  target: ConnectorRecord,
  tableName: 'connectors',
  columns: {
    id: { type: 'uuid', primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    orgId: { type: 'uuid' },
    product: { type: 'enum', enum: ConnectorProduct },
    setup: { type: 'jsonb', default: {} },
    encryptedCredentials: { type: 'text', nullable: true },
  },
  uniques: [{ columns: ['orgId', 'product'] }],
});

describe('LocalConnectorsRepository', () => {
  const orgA = randomUUID();
  const orgB = randomUUID();
  const schema = `ayc1631_connectors_${randomUUID().replaceAll('-', '')}`;
  let db: DataSource;
  let repository: LocalConnectorsRepository;

  beforeAll(async () => {
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [connectorSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    repository = new LocalConnectorsRepository(
      db.getRepository(ConnectorRecord),
      new ConnectorMapper(),
    );
  }, 30_000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  }, 30_000);

  it("returns only the organization's own connectors, never another organization's", async () => {
    await db.getRepository(ConnectorRecord).insert({
      id: randomUUID(),
      orgId: orgA,
      product: ConnectorProduct.MICROSOFT_365,
      setup: { tenantId: '6f1c2c4e-3c1a-4f4e-9a59-2f1f0b8a7d11' },
      encryptedCredentials: 'c2VhbGVk',
    });

    const ofOrgA = await repository.findAllByOrgId(orgA);
    const ofOrgB = await repository.findAllByOrgId(orgB);

    expect(ofOrgA).toHaveLength(1);
    expect(ofOrgA[0]).toMatchObject({
      orgId: orgA,
      product: ConnectorProduct.MICROSOFT_365,
      setup: { tenantId: '6f1c2c4e-3c1a-4f4e-9a59-2f1f0b8a7d11' },
      status: ConnectorStatus.SET_UP,
    });
    expect(ofOrgB).toEqual([]);
  });

  describe('setting up and removing a connection', () => {
    const M365 = ConnectorProduct.MICROSOFT_365;
    const setup = {
      tenantId: '6f1c2c4e-3c1a-4f4e-9a59-2f1f0b8a7d11',
      clientId: '0b8a7d11-2f1f-4f4e-9a59-6f1c2c4e3c1a',
    };
    const otherSetup = {
      tenantId: '9a592f1f-0b8a-4d11-8f4e-6f1c2c4e3c1a',
      clientId: '3c1a4f4e-6f1c-4c4e-9a59-2f1f0b8a7d11',
    };

    const setUp = (orgId: typeof orgA, encryptedCredentials: string) =>
      repository.upsert(
        new Connector({ orgId, product: M365, setup, encryptedCredentials }),
      );
    const stored = (orgId: typeof orgA) =>
      db.getRepository(ConnectorRecord).findOneBy({ orgId, product: M365 });

    let org: typeof orgA;
    beforeEach(() => {
      org = randomUUID();
    });

    it('setting up again replaces setup and credentials but keeps the connector, so references to it stay valid', async () => {
      const first = await setUp(org, 'Zmlyc3Q=');

      const second = await repository.upsert(
        new Connector({
          orgId: org,
          product: M365,
          setup: otherSetup,
          encryptedCredentials: 'c2Vjb25k',
        }),
      );

      expect(second.id).toBe(first.id);
      expect(await stored(org)).toMatchObject({
        id: first.id,
        setup: otherSetup,
        encryptedCredentials: 'c2Vjb25k',
      });
    });

    it('changing the setup without new credentials keeps the stored credentials', async () => {
      await setUp(org, 'a2VlcCBtZQ==');

      const updated = await repository.updateSetupOfSetUp(
        org,
        M365,
        otherSetup,
      );

      expect(updated).toMatchObject({
        setup: otherSetup,
        status: ConnectorStatus.SET_UP,
      });
      expect(await stored(org)).toMatchObject({
        setup: otherSetup,
        encryptedCredentials: 'a2VlcCBtZQ==',
      });
    });

    it('removing clears setup and credentials but keeps the connector, so setting it up again reconnects it', async () => {
      const { id } = await setUp(org, 'Zmlyc3Q=');

      await repository.clearSetupAndCredentials(org, M365);

      expect(await stored(org)).toMatchObject({
        id,
        setup: {},
        encryptedCredentials: null,
      });
      expect(await setUp(org, 'YWdhaW4=')).toMatchObject({
        id,
        status: ConnectorStatus.SET_UP,
      });
    });

    it('a removed connection cannot be set up again without credentials', async () => {
      await setUp(org, 'Zmlyc3Q=');
      await repository.clearSetupAndCredentials(org, M365);

      await expect(
        repository.updateSetupOfSetUp(org, M365, setup),
      ).resolves.toBeNull();
      expect(await stored(org)).toMatchObject({
        setup: {},
        encryptedCredentials: null,
      });
    });

    it("never changes another organization's connection", async () => {
      const other = randomUUID();
      await setUp(org, 'b3Vycw==');

      await expect(
        repository.updateSetupOfSetUp(other, M365, otherSetup),
      ).resolves.toBeNull();
      await repository.clearSetupAndCredentials(other, M365);
      const theirs = await setUp(other, 'dGhlaXJz');

      expect(await stored(org)).toMatchObject({
        setup,
        encryptedCredentials: 'b3Vycw==',
      });
      expect(theirs.id).not.toBe((await stored(org))?.id);
    });
  });
});
