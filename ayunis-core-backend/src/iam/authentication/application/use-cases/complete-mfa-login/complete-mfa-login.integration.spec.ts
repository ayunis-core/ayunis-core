import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { LocalMfaRecoveryCodesRepository } from 'src/iam/mfa/infrastructure/repositories/local/local-mfa-recovery-codes.repository';
import { LocalUserTotpsRepository } from 'src/iam/mfa/infrastructure/repositories/local/local-user-totps.repository';
import { MfaRecoveryCodeRecord } from 'src/iam/mfa/infrastructure/repositories/local/schema/mfa-recovery-code.record';
import { UserTotpRecord } from 'src/iam/mfa/infrastructure/repositories/local/schema/user-totp.record';
import { CompleteMfaLoginUseCase } from './complete-mfa-login.use-case';
import { CompleteMfaLoginCommand } from './complete-mfa-login.command';
import { VerifyMfaCodeUseCase } from 'src/iam/mfa/application/use-cases/verify-mfa-code/verify-mfa-code.use-case';
import {
  InvalidMfaCodeError,
  MfaLockedError,
} from 'src/iam/mfa/application/mfa.errors';
import { MAX_FAILED_ATTEMPTS } from 'src/iam/mfa/domain/mfa.constants';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import { aUser } from 'src/iam/users/application/testing/user.fixtures';
import type { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import type { LocalPasswordLoginPolicyService } from 'src/iam/authentication/application/services/local-password-login-policy.service';
import type { LoginUseCase } from 'src/iam/authentication/application/use-cases/login/login.use-case';
import type { ConfirmTotpUseCase } from 'src/iam/mfa/application/use-cases/confirm-totp/confirm-totp.use-case';
import type { TotpSecretEncryptionPort } from 'src/iam/mfa/application/ports/totp-secret-encryption.port';
import type { TotpPort } from 'src/iam/mfa/application/ports/totp.port';
import type { CompareHashUseCase } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.use-case';

const userTotpSchema = new EntitySchema<UserTotpRecord>({
  name: 'UserTotpRecord',
  target: UserTotpRecord,
  tableName: 'user_totps',
  columns: {
    id: { type: 'uuid', primary: true },
    userId: { type: 'uuid', unique: true },
    encryptedSecret: { type: String },
    confirmedAt: { type: 'timestamptz', nullable: true },
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: 'timestamptz', nullable: true },
    lastUsedCounter: { type: Number, nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
});

const recoveryCodeSchema = new EntitySchema<MfaRecoveryCodeRecord>({
  name: 'MfaRecoveryCodeRecord',
  target: MfaRecoveryCodeRecord,
  tableName: 'mfa_recovery_codes',
  columns: {
    id: { type: 'uuid', primary: true },
    userId: { type: 'uuid' },
    codeHash: { type: String },
    usedAt: { type: 'timestamptz', nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
});

describe('MFA completion transaction', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let txHost: TransactionHost<TransactionalAdapterTypeOrm>;
  const userId = randomUUID();
  const totpId = randomUUID();
  const recoveryCodeId = randomUUID();

  beforeAll(async () => {
    schemaName = `ayc_868_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [userTotpSchema, recoveryCodeSchema],
      migrations: [],
      migrationsRun: false,
      poolSize: 2,
      extra: { connectionTimeoutMillis: 1000 },
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();
    txHost = createTransactionHost(dataSource);
  });

  beforeEach(async () => {
    await dataSource.getRepository(UserTotpRecord).save({
      id: totpId,
      userId,
      encryptedSecret: 'encrypted-secret',
      confirmedAt: new Date(),
      failedAttempts: 0,
      lockedUntil: null,
      lastUsedCounter: null,
    });
    await dataSource.getRepository(MfaRecoveryCodeRecord).save({
      id: recoveryCodeId,
      userId,
      codeHash: 'hash',
      usedAt: null,
    });
  });

  afterEach(async () => {
    await dataSource.getRepository(MfaRecoveryCodeRecord).delete({ userId });
    await dataSource.getRepository(UserTotpRecord).delete({ userId });
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  it('rolls back consumed MFA state when session issuance fails', async () => {
    const totps = new LocalUserTotpsRepository(txHost);
    const recoveryCodes = new LocalMfaRecoveryCodesRepository(txHost);

    await expect(
      txHost.withTransaction(async () => {
        await totps.markVerified(userId, 42);
        await recoveryCodes.consume(recoveryCodeId, new Date());
        throw new Error('session issuance failed');
      }),
    ).rejects.toThrow('session issuance failed');

    const totp = await dataSource
      .getRepository(UserTotpRecord)
      .findOneByOrFail({ id: totpId });
    const recoveryCode = await dataSource
      .getRepository(MfaRecoveryCodeRecord)
      .findOneByOrFail({ id: recoveryCodeId });
    expect(totp.lastUsedCounter).toBeNull();
    expect(recoveryCode.usedAt).toBeNull();
  });

  it.each([
    SessionAuthenticationMethod.PASSWORD,
    SessionAuthenticationMethod.SSO,
  ])(
    'persists failed attempts and locks rejected %s MFA logins',
    async (authenticationMethod) => {
      const { complete, login } = completion(null);
      const command = new CompleteMfaLoginCommand({
        userId,
        code: '000000',
        operation: 'verify',
        authenticationMethod,
        zitadelSessionId: null,
      });
      for (let attempt = 1; attempt <= MAX_FAILED_ATTEMPTS; attempt++) {
        await expect(complete.execute(command)).rejects.toThrow(
          attempt === MAX_FAILED_ATTEMPTS
            ? MfaLockedError
            : InvalidMfaCodeError,
        );
        const persisted = await dataSource
          .getRepository(UserTotpRecord)
          .findOneByOrFail({ id: totpId });
        expect(persisted.failedAttempts).toBe(attempt);
      }
      await expect(complete.execute(command)).rejects.toThrow(MfaLockedError);
      const persisted = await dataSource
        .getRepository(UserTotpRecord)
        .findOneByOrFail({ id: totpId });
      expect(persisted.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
      expect(persisted.failedAttempts).toBe(MAX_FAILED_ATTEMPTS);
      expect(login.execute).not.toHaveBeenCalled();
    },
  );

  it('preserves an unconsumed factor when the real completion flow cannot issue a session', async () => {
    const { complete } = completion(42);
    await expect(
      complete.execute(
        new CompleteMfaLoginCommand({
          userId,
          code: '123456',
          operation: 'verify',
          authenticationMethod: SessionAuthenticationMethod.PASSWORD,
          zitadelSessionId: null,
        }),
      ),
    ).rejects.toThrow();
    const persisted = await dataSource
      .getRepository(UserTotpRecord)
      .findOneByOrFail({ id: totpId });
    expect(persisted.lastUsedCounter).toBeNull();
  });

  it('persists concurrent rejections without acquiring a second connection per login', async () => {
    const { complete, policy, login } = completion(null);
    let release!: () => void;
    const bothTransactionsStarted = new Promise<void>((resolve) => {
      release = resolve;
    });
    let pending = 2;
    policy.assertSessionIssuanceAllowed.mockImplementation(async () => {
      if (--pending === 0) release();
      await bothTransactionsStarted;
    });
    const command = new CompleteMfaLoginCommand({
      userId,
      code: '000000',
      operation: 'verify',
      authenticationMethod: SessionAuthenticationMethod.PASSWORD,
      zitadelSessionId: null,
    });
    const results = await Promise.allSettled([
      complete.execute(command),
      complete.execute(command),
    ]);
    for (const result of results) {
      expect(result).toMatchObject({
        status: 'rejected',
        reason: expect.any(InvalidMfaCodeError),
      });
    }
    const persisted = await dataSource
      .getRepository(UserTotpRecord)
      .findOneByOrFail({ id: totpId });
    expect(persisted.failedAttempts).toBe(2);
    expect(login.execute).not.toHaveBeenCalled();
  });

  function completion(counter: number | null) {
    const verify = new VerifyMfaCodeUseCase(
      new LocalUserTotpsRepository(txHost),
      new LocalMfaRecoveryCodesRepository(txHost),
      {
        decrypt: jest.fn().mockResolvedValue('secret'),
      } as unknown as TotpSecretEncryptionPort,
      {
        verifyCode: jest.fn().mockResolvedValue(counter),
      } as unknown as TotpPort,
      {} as CompareHashUseCase,
    );
    const login = {
      execute: jest
        .fn()
        .mockRejectedValue(new Error('session issuance failed')),
    };
    const policy = { assertSessionIssuanceAllowed: jest.fn() };
    const complete = new CompleteMfaLoginUseCase(
      {
        execute: jest.fn().mockResolvedValue(aUser({ id: userId })),
      } as unknown as FindUserByIdUseCase,
      policy as unknown as LocalPasswordLoginPolicyService,
      verify,
      {} as ConfirmTotpUseCase,
      login as unknown as LoginUseCase,
    );
    return { complete, login, policy };
  }
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
