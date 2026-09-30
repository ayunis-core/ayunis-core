import { randomUUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { PasswordSetToken } from 'src/iam/users/domain/password-set-token.entity';
import { PasswordSetTokenPurpose } from 'src/iam/users/domain/value-objects/password-set-token-purpose.enum';
import { PasswordSetTokenRecord } from './schema/password-set-token.record';
import { LocalPasswordSetTokensRepository } from './local-password-set-tokens.repository';

const tokenSchema = new EntitySchema<PasswordSetTokenRecord>({
  name: 'PasswordSetTokenRecord',
  target: PasswordSetTokenRecord,
  tableName: 'tokens',
  columns: {
    id: { type: 'uuid', primary: true },
    usedAt: { type: 'timestamp', nullable: true },
    userId: { type: 'uuid' },
    purpose: { type: String },
    tokenHash: { type: String },
    expiresAt: { type: 'timestamp' },
    createdAt: { type: 'timestamp' },
    updatedAt: { type: 'timestamp' },
  },
});

describe('Password token consumption transaction', () => {
  let db: DataSource;
  let schema: string;
  let txHost: TransactionHost<TransactionalAdapterTypeOrm>;
  let repository: LocalPasswordSetTokensRepository;
  let tokenId: ReturnType<typeof randomUUID>;
  let originalToken: PasswordSetToken;

  beforeAll(async () => {
    schema = `ayc496_tokens_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [tokenSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    await configureRepository();
  });

  async function configureRepository(): Promise<void> {
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
    const module = await Test.createTestingModule({
      providers: [
        LocalPasswordSetTokensRepository,
        {
          provide: getRepositoryToken(PasswordSetTokenRecord),
          useValue: db.getRepository(PasswordSetTokenRecord),
        },
        { provide: TransactionHost, useValue: txHost },
      ],
    }).compile();
    repository = module.get(LocalPasswordSetTokensRepository);
  }

  beforeEach(async () => {
    tokenId = randomUUID();
    originalToken = new PasswordSetToken({
      id: tokenId,
      userId: randomUUID(),
      purpose: PasswordSetTokenPurpose.RESET,
      tokenHash: randomUUID(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await db.getRepository(PasswordSetTokenRecord).insert(originalToken);
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  });

  it('preserves token usability after password reset rolls back', async () => {
    await expect(
      txHost.withTransaction(async () => {
        expect(await repository.consume(tokenId, new Date())).toBe(true);
        throw new Error('password update failed');
      }),
    ).rejects.toThrow('password update failed');
    expect(
      await db.getRepository(PasswordSetTokenRecord).findOneBy({ id: tokenId }),
    ).toMatchObject({ usedAt: null });
    expect(await repository.consume(tokenId, new Date())).toBe(true);
    expect(await repository.consume(tokenId, new Date())).toBe(false);
  });

  it('keeps successful consumption single-use after commit', async () => {
    await txHost.withTransaction(async () => {
      expect(await repository.consume(tokenId, new Date())).toBe(true);
    });
    expect(await repository.consume(tokenId, new Date())).toBe(false);
  });

  it('nests token replacement in CLS and preserves the old token on outer rollback', async () => {
    const replacement = new PasswordSetToken({
      userId: originalToken.userId,
      purpose: originalToken.purpose,
      tokenHash: randomUUID(),
      expiresAt: originalToken.expiresAt,
    });
    await expect(
      txHost.withTransaction(async () => {
        await repository.replaceForUser(
          originalToken.userId,
          originalToken.purpose,
          replacement,
        );
        expect(
          await repository.findByTokenHash(replacement.tokenHash),
        ).toMatchObject({ id: replacement.id });
        throw new Error('outer operation failed');
      }),
    ).rejects.toThrow('outer operation failed');
    expect(
      await repository.findByTokenHash(originalToken.tokenHash),
    ).toMatchObject({ id: tokenId });
    expect(await repository.findByTokenHash(replacement.tokenHash)).toBeNull();
    await txHost.withTransaction(() =>
      repository.replaceForUser(
        originalToken.userId,
        originalToken.purpose,
        replacement,
      ),
    );
    expect(
      await repository.findByTokenHash(originalToken.tokenHash),
    ).toBeNull();
    expect(
      await repository.findByTokenHash(replacement.tokenHash),
    ).toMatchObject({ id: replacement.id });
  });
});
