import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { LocalApiKeysRepository } from 'src/iam/api-keys/infrastructure/repositories/local/local-api-keys.repository';
import { ApiKeyRecord } from 'src/iam/api-keys/infrastructure/repositories/local/schema/api-key.record';

const apiKeySchema = new EntitySchema<ApiKeyRecord>({
  name: 'ApiKeyRecord',
  target: ApiKeyRecord,
  tableName: 'api_keys',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    name: { type: String, length: 100 },
    description: { type: String, length: 500, nullable: true },
    prefix: { type: String },
    hash: { type: String },
    expiresAt: { name: 'expires_at', type: 'timestamptz', nullable: true },
    revokedAt: { name: 'revoked_at', type: 'timestamptz', nullable: true },
    orgId: { name: 'org_id', type: String },
    createdByUserId: {
      name: 'created_by_user_id',
      type: String,
      nullable: true,
    },
  },
});

const orgId = randomUUID();
const otherOrgId = randomUUID();

describe('LocalApiKeysRepository.updateMetadataIfActive', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let repository: LocalApiKeysRepository;

  beforeAll(async () => {
    schemaName = `api_key_edit_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [apiKeySchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();
    repository = new LocalApiKeysRepository(
      dataSource.getRepository(ApiKeyRecord),
    );
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  async function insertKey(
    overrides: Partial<{
      orgId: UUID;
      expiresAt: Date | null;
      revokedAt: Date | null;
    }> = {},
  ): Promise<UUID> {
    const id = randomUUID();
    await dataSource.getRepository(ApiKeyRecord).insert({
      id,
      name: 'Citizen portal',
      description: 'Original',
      prefix: randomUUID().slice(0, 12),
      hash: 'h',
      orgId: overrides.orgId ?? orgId,
      expiresAt: overrides.expiresAt ?? null,
      revokedAt: overrides.revokedAt ?? null,
      createdByUserId: null,
    });
    return id;
  }

  async function load(id: UUID) {
    return dataSource.getRepository(ApiKeyRecord).findOneByOrFail({ id });
  }

  it('updates only the given fields of an active key', async () => {
    const id = await insertKey({
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const updated = await repository.updateMetadataIfActive(id, orgId, {
      name: 'Citizen portal v2',
    });

    expect(updated).toBe(true);
    expect(await load(id)).toMatchObject({
      name: 'Citizen portal v2',
      description: 'Original',
    });
  });

  it('sets and removes the expiry date of an active key', async () => {
    const id = await insertKey();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await repository.updateMetadataIfActive(id, orgId, { expiresAt });
    expect((await load(id)).expiresAt?.getTime()).toBe(expiresAt.getTime());

    await repository.updateMetadataIfActive(id, orgId, { expiresAt: null });
    expect((await load(id)).expiresAt).toBeNull();
  });

  it('clears the description when null is given', async () => {
    const id = await insertKey();

    await repository.updateMetadataIfActive(id, orgId, { description: null });

    expect((await load(id)).description).toBeNull();
  });

  it.each([
    ['revoked', { revokedAt: new Date(Date.now() - 1000) }],
    ['expired', { expiresAt: new Date(Date.now() - 1000) }],
    ['owned by another org', { orgId: otherOrgId }],
  ])('leaves a key %s untouched', async (_label, overrides) => {
    const id = await insertKey(overrides);

    const updated = await repository.updateMetadataIfActive(id, orgId, {
      name: 'Should not change',
    });

    expect(updated).toBe(false);
    expect((await load(id)).name).toBe('Citizen portal');
  });
});
