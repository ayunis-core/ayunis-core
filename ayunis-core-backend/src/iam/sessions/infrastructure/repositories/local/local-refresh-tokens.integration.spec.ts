import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { RefreshTokenFactory } from 'src/iam/sessions/application/services/refresh-token.factory';
import { RefreshTokenReuseError } from 'src/iam/sessions/application/sessions.errors';
import { ForkSessionCommand } from 'src/iam/sessions/application/use-cases/fork-session/fork-session.command';
import { ForkSessionUseCase } from 'src/iam/sessions/application/use-cases/fork-session/fork-session.use-case';
import { RotateSessionCommand } from 'src/iam/sessions/application/use-cases/rotate-session/rotate-session.command';
import { RotateSessionUseCase } from 'src/iam/sessions/application/use-cases/rotate-session/rotate-session.use-case';
import { RefreshToken } from 'src/iam/sessions/domain/refresh-token.entity';
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
    client: { type: 'varchar', nullable: true },
    expiresAt: { type: 'timestamptz' },
    usedAt: { type: 'timestamptz', nullable: true },
    revokedAt: { type: 'timestamptz', nullable: true },
    replacedByTokenId: { type: 'uuid', nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
});

describe('Refresh token issuance concurrent with revocation', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let issuingHost: TransactionHost<TransactionalAdapterTypeOrm>;
  let revokingHost: TransactionHost<TransactionalAdapterTypeOrm>;
  let issuingRepository: LocalRefreshTokensRepository;
  let revokingRepository: LocalRefreshTokensRepository;
  let factory: RefreshTokenFactory;
  let configService: ConfigService;

  beforeAll(async () => {
    schemaName = `refresh_revocation_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [refreshTokenSchema],
      migrations: [],
      migrationsRun: false,
      poolSize: 5,
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();
    issuingHost = createTransactionHost(dataSource);
    revokingHost = createTransactionHost(dataSource);
    issuingRepository = createRepository(dataSource, issuingHost);
    revokingRepository = createRepository(dataSource, revokingHost);
    configService = new ConfigService({
      auth: {
        jwt: { refreshTokenExpiresIn: '7d' },
        session: { refreshTokenGraceSeconds: 60 },
      },
      ssoOidc: { reauthenticationMaxAgeSeconds: 86_400 },
    });
    factory = new RefreshTokenFactory(configService);
  }, 30_000);

  afterEach(async () => {
    await dataSource.getRepository(RefreshTokenRecord).clear();
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  }, 30_000);

  it('leaves no valid token when rotation races revoke-all', async () => {
    const current = await saveCurrentToken(dataSource);
    const useCase = new RotateSessionUseCase(
      issuingRepository,
      factory,
      configService,
    );

    await raceIssuanceWithRevocation(
      issuingHost,
      () => useCase.execute(new RotateSessionCommand(current)),
      () => revokingRepository.revokeAllForUser(current.userId),
    );

    await expectNoValidTokens(dataSource, current.userId);
  });

  it('rejects rotation when revoke-all acquires the user lock first', async () => {
    const current = await saveCurrentToken(dataSource);
    const useCase = new RotateSessionUseCase(
      issuingRepository,
      factory,
      configService,
    );
    const revoked = deferred();
    const releaseRevocation = deferred();
    const revocation = revokingHost.withTransaction(async () => {
      await revokingRepository.revokeAllForUser(current.userId);
      revoked.resolve();
      await releaseRevocation.promise;
    });
    await revoked.promise;

    const issuance = useCase.execute(new RotateSessionCommand(current));
    const rejected = expect(issuance).rejects.toBeInstanceOf(
      RefreshTokenReuseError,
    );
    releaseRevocation.resolve();
    await revocation;
    await rejected;
    await expectNoValidTokens(dataSource, current.userId);
  });

  it('leaves no grace sibling when a lost rotation races revoke-all', async () => {
    const current = await saveCurrentToken(dataSource);
    const useCase = new RotateSessionUseCase(
      issuingRepository,
      factory,
      configService,
    );
    await useCase.execute(new RotateSessionCommand(current));

    await raceIssuanceWithRevocation(
      issuingHost,
      () => useCase.execute(new RotateSessionCommand(current)),
      () => revokingRepository.revokeAllForUser(current.userId),
    );

    await expectNoValidTokens(dataSource, current.userId);
  });

  it('leaves no valid token when a fork races revoke-all', async () => {
    const current = await saveCurrentToken(dataSource);
    const useCase = new ForkSessionUseCase(
      issuingRepository,
      factory,
      configService,
    );

    await raceIssuanceWithRevocation(
      issuingHost,
      () => useCase.execute(new ForkSessionCommand(current, 'outlook')),
      () => revokingRepository.revokeAllForUser(current.userId),
    );

    await expectNoValidTokens(dataSource, current.userId);
  });

  it('rejects a fork when revoke-all acquires the user lock first', async () => {
    const current = await saveCurrentToken(dataSource);
    const useCase = new ForkSessionUseCase(
      issuingRepository,
      factory,
      configService,
    );
    const revoked = deferred();
    const releaseRevocation = deferred();
    const revocation = revokingHost.withTransaction(async () => {
      await revokingRepository.revokeAllForUser(current.userId);
      revoked.resolve();
      await releaseRevocation.promise;
    });
    await revoked.promise;

    const issuance = useCase.execute(
      new ForkSessionCommand(current, 'outlook'),
    );
    const rejected = expect(issuance).rejects.toBeInstanceOf(
      RefreshTokenReuseError,
    );
    releaseRevocation.resolve();
    await revocation;
    await rejected;
    await expectNoValidTokens(dataSource, current.userId);
  });

  it('does not fork a stale source that moved outside the grace window', async () => {
    const current = await saveCurrentToken(dataSource);
    await dataSource.getRepository(RefreshTokenRecord).update(current.id, {
      usedAt: new Date(Date.now() - 120_000),
    });
    const useCase = new ForkSessionUseCase(
      issuingRepository,
      factory,
      configService,
    );

    await expect(
      useCase.execute(new ForkSessionCommand(current, 'outlook')),
    ).rejects.toBeInstanceOf(RefreshTokenReuseError);
    expect(await dataSource.getRepository(RefreshTokenRecord).count()).toBe(1);
  });

  it('revokes a concurrent fork while preserving the current family', async () => {
    const current = await saveCurrentToken(dataSource);
    const useCase = new ForkSessionUseCase(
      issuingRepository,
      factory,
      configService,
    );

    await raceIssuanceWithRevocation(
      issuingHost,
      () => useCase.execute(new ForkSessionCommand(current, 'outlook')),
      () =>
        revokingRepository.revokeAllForUserExceptFamily(
          current.userId,
          current.familyId,
        ),
    );

    await expectNoValidTokensOutsideFamily(
      dataSource,
      current.userId,
      current.familyId,
    );
    await expectValidTokenCount(
      dataSource,
      current.userId,
      SessionAuthenticationMethod.PASSWORD,
      1,
    );
  });

  it('leaves no valid token when an SSO fork races backchannel revocation', async () => {
    const current = await saveCurrentToken(dataSource, {
      authenticationMethod: SessionAuthenticationMethod.SSO,
      zitadelSessionId: `zitadel-${randomUUID()}`,
      familyExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    await saveCurrentToken(dataSource, { userId: current.userId });
    const useCase = new ForkSessionUseCase(
      issuingRepository,
      factory,
      configService,
    );

    await raceIssuanceWithRevocation(
      issuingHost,
      () => useCase.execute(new ForkSessionCommand(current, 'outlook')),
      () =>
        revokingRepository.revokeByZitadelSessionId(current.zitadelSessionId!),
    );

    await expectNoValidTokens(
      dataSource,
      current.userId,
      SessionAuthenticationMethod.SSO,
    );
    await expectValidTokenCount(
      dataSource,
      current.userId,
      SessionAuthenticationMethod.PASSWORD,
      1,
    );
  });
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
  }, 30_000);

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
  }, 30_000);

  afterEach(async () => {
    await dataSource.getRepository(RefreshTokenRecord).delete({ id: tokenId });
  }, 30_000);

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  }, 30_000);

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

function createRepository(
  dataSource: DataSource,
  txHost: TransactionHost<TransactionalAdapterTypeOrm>,
): LocalRefreshTokensRepository {
  return new LocalRefreshTokensRepository(
    dataSource.getRepository(RefreshTokenRecord),
    txHost,
  );
}

async function saveCurrentToken(
  dataSource: DataSource,
  overrides: Partial<
    Pick<
      RefreshToken,
      'userId' | 'authenticationMethod' | 'zitadelSessionId' | 'familyExpiresAt'
    >
  > = {},
): Promise<RefreshToken> {
  const current = new RefreshToken({
    userId: overrides.userId ?? randomUUID(),
    familyId: randomUUID(),
    tokenHash: `hash-${randomUUID()}`,
    authenticationMethod:
      overrides.authenticationMethod ?? SessionAuthenticationMethod.PASSWORD,
    zitadelSessionId: overrides.zitadelSessionId,
    familyExpiresAt: overrides.familyExpiresAt,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  await dataSource.getRepository(RefreshTokenRecord).save(current);
  return current;
}

async function raceIssuanceWithRevocation(
  issuingHost: TransactionHost<TransactionalAdapterTypeOrm>,
  issue: () => Promise<unknown>,
  revoke: () => Promise<void>,
): Promise<void> {
  const issued = deferred();
  const releaseIssuance = deferred();
  const issuance = issuingHost.withTransaction(async () => {
    await issue();
    issued.resolve();
    await releaseIssuance.promise;
  });
  await issued.promise;

  const revocation = revoke();
  await Promise.race([revocation, delay(100)]);
  releaseIssuance.resolve();
  await Promise.all([issuance, revocation]);
}

async function expectNoValidTokens(
  dataSource: DataSource,
  userId: string,
  method?: SessionAuthenticationMethod,
): Promise<void> {
  await expectValidTokenCount(dataSource, userId, method, 0);
}

async function expectValidTokenCount(
  dataSource: DataSource,
  userId: string,
  method: SessionAuthenticationMethod | undefined,
  expected: number,
): Promise<void> {
  const query = dataSource
    .getRepository(RefreshTokenRecord)
    .createQueryBuilder('token')
    .where('token.userId = :userId', { userId })
    .andWhere('token.revokedAt IS NULL')
    .andWhere('token.expiresAt > NOW()');
  if (method) {
    query.andWhere('token.authenticationMethod = :method', { method });
  }
  expect(await query.getCount()).toBe(expected);
}

async function expectNoValidTokensOutsideFamily(
  dataSource: DataSource,
  userId: string,
  familyId: string,
): Promise<void> {
  const count = await dataSource
    .getRepository(RefreshTokenRecord)
    .createQueryBuilder('token')
    .where('token.userId = :userId', { userId })
    .andWhere('token.familyId != :familyId', { familyId })
    .andWhere('token.revokedAt IS NULL')
    .andWhere('token.expiresAt > NOW()')
    .getCount();
  expect(count).toBe(0);
}

function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
