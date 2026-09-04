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
