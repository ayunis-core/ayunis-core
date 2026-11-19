import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
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
});
