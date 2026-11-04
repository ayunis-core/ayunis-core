import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { ConfigService } from '@nestjs/config';
import { randomUUID, type UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { sha256Hex } from 'src/common/util/sha256.util';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import type { CompareHashUseCase } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.use-case';
import type { HashTextUseCase } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.use-case';
import { RevokeAllSessionsForUserUseCase } from 'src/iam/sessions/application/use-cases/revoke-all-sessions-for-user/revoke-all-sessions-for-user.use-case';
import { RevokeOtherSessionsForUserUseCase } from 'src/iam/sessions/application/use-cases/revoke-other-sessions-for-user/revoke-other-sessions-for-user.use-case';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import { LocalRefreshTokensRepository } from 'src/iam/sessions/infrastructure/repositories/local/local-refresh-tokens.repository';
import { RefreshTokenRecord } from 'src/iam/sessions/infrastructure/repositories/local/schema/refresh-token.record';
import type { GetOrgAuthenticationPolicyUseCase } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.use-case';
import { PasswordSetTokenService } from 'src/iam/users/application/services/password-set-token.service';
import type { IsValidPasswordUseCase } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.use-case';
import { ResetPasswordCommand } from 'src/iam/users/application/use-cases/reset-password/reset-password.command';
import { ResetPasswordUseCase } from 'src/iam/users/application/use-cases/reset-password/reset-password.use-case';
import { UpdatePasswordCommand } from 'src/iam/users/application/use-cases/update-password/update-password.command';
import { UpdatePasswordUseCase } from 'src/iam/users/application/use-cases/update-password/update-password.use-case';
import { PasswordSetTokenPurpose } from 'src/iam/users/domain/value-objects/password-set-token-purpose.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { LocalPasswordSetTokensRepository } from 'src/iam/users/infrastructure/repositories/local/local-password-set-tokens.repository';
import { LocalUsersRepository } from 'src/iam/users/infrastructure/repositories/local/local-users.repository';
import { PasswordSetTokenRecord } from 'src/iam/users/infrastructure/repositories/local/schema/password-set-token.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import type { ContextService } from 'src/common/context/services/context.service';

const userSchema = new EntitySchema<UserRecord>({
  name: 'UserRecord',
  target: UserRecord,
  tableName: 'users',
  columns: {
    id: { type: 'uuid', primary: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
    email: { type: String, unique: true },
    emailVerified: { type: Boolean, default: true },
    name: { type: String },
    passwordHash: { type: 'varchar', nullable: true },
    role: { type: 'enum', enum: UserRole },
    systemRole: { type: 'enum', enum: SystemRole },
    orgId: { type: 'uuid' },
    hasAcceptedMarketing: { type: Boolean, default: false },
    department: { type: String, nullable: true },
    failedLoginAttempts: { type: Number, default: 0 },
    failedLoginWindowStartedAt: { type: 'timestamptz', nullable: true },
    lockedAt: { type: 'timestamptz', nullable: true },
  },
});

const passwordSetTokenSchema = new EntitySchema<PasswordSetTokenRecord>({
  name: 'PasswordSetTokenRecord',
  target: PasswordSetTokenRecord,
  tableName: 'password_set_tokens',
  columns: {
    id: { type: 'uuid', primary: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
    userId: { type: 'uuid' },
    tokenHash: { type: String, unique: true },
    purpose: { type: String },
    expiresAt: { type: 'timestamptz' },
    usedAt: { type: 'timestamptz', nullable: true },
  },
});

const refreshTokenSchema = new EntitySchema<RefreshTokenRecord>({
  name: 'RefreshTokenRecord',
  target: RefreshTokenRecord,
  tableName: 'refresh_tokens',
  columns: {
    id: { type: 'uuid', primary: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
    userId: { type: 'uuid' },
    familyId: { type: 'uuid' },
    tokenHash: { type: String, unique: true },
    authenticationMethod: {
      type: 'enum',
      enum: SessionAuthenticationMethod,
    },
    zitadelSessionId: { type: 'varchar', nullable: true },
    familyExpiresAt: { type: 'timestamptz', nullable: true },
    expiresAt: { type: 'timestamptz' },
    usedAt: { type: 'timestamptz', nullable: true },
    revokedAt: { type: 'timestamptz', nullable: true },
    replacedByTokenId: { type: 'uuid', nullable: true },
  },
});

describe('Password change transactions', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let resetPassword: ResetPasswordUseCase;
  let updatePassword: UpdatePasswordUseCase;

  const userId = randomUUID();
  const orgId = randomUUID();
  const passwordTokenId = randomUUID();
  const actorTokenId = randomUUID();
  const otherTokenId = randomUUID();
  const actorFamilyId = randomUUID();
  const otherFamilyId = randomUUID();
  const resetToken = 'reset-password-token';
  const actorRefreshToken = 'actor-refresh-token';
  const oldPasswordHash = 'old-password-hash';
  const newPasswordHash = 'new-password-hash';

  beforeAll(async () => {
    schemaName = `ayc_1436_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [userSchema, passwordSetTokenSchema, refreshTokenSchema],
      migrations: [],
      migrationsRun: false,
    });
    await dataSource.initialize();
    const runner = dataSource.createQueryRunner();
    await runner.createSchema(schemaName, true);
    await runner.release();
    await dataSource.synchronize();
    await dataSource.query(`
      CREATE FUNCTION "${schemaName}".fail_refresh_revocation()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'refresh revocation failed';
      END;
      $$
    `);
    configureUseCases(createTransactionHost(dataSource));
  }, 30_000);

  beforeEach(async () => {
    await dataSource.getRepository(RefreshTokenRecord).clear();
    await dataSource.getRepository(PasswordSetTokenRecord).clear();
    await dataSource.getRepository(UserRecord).clear();
    await seedPasswordState();
  }, 30_000);

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const runner = dataSource.createQueryRunner();
    await runner.dropSchema(schemaName, true, true);
    await runner.release();
    await dataSource.destroy();
  }, 30_000);

  it('rolls back reset token consumption and password change when session revocation fails', async () => {
    await expectRevocationFailure(() =>
      resetPassword.execute(resetPasswordCommand()),
    );

    await expectPasswordAndToken(oldPasswordHash, null);
    await expectSessions(null, null);
  });

  it('commits reset token consumption, password change, and session revocation together', async () => {
    await resetPassword.execute(resetPasswordCommand());

    await expectPasswordAndToken(newPasswordHash, expect.any(Date));
    await expectSessions(expect.any(Date), expect.any(Date));
  });

  it('rolls back an authenticated password change when session revocation fails', async () => {
    await expectRevocationFailure(() =>
      updatePassword.execute(updatePasswordCommand()),
    );

    await expectPasswordAndToken(oldPasswordHash, null);
    await expectSessions(null, null);
  });

  it('commits an authenticated password change while preserving the actor session', async () => {
    await updatePassword.execute(updatePasswordCommand());

    await expectPasswordAndToken(newPasswordHash, null);
    await expectSessions(null, expect.any(Date));
  });

  function configureUseCases(
    txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ): void {
    const users = new LocalUsersRepository(txHost);
    const passwordTokens = new LocalPasswordSetTokensRepository(
      dataSource.getRepository(PasswordSetTokenRecord),
      txHost,
    );
    const refreshTokens = new LocalRefreshTokensRepository(
      dataSource.getRepository(RefreshTokenRecord),
      txHost,
    );
    const hashText = {
      execute: jest.fn().mockResolvedValue(newPasswordHash),
    } as unknown as HashTextUseCase;
    resetPassword = new ResetPasswordUseCase(
      new PasswordSetTokenService(
        { get: jest.fn() } as unknown as ConfigService,
        passwordTokens,
      ),
      passwordTokens,
      hashText,
      {
        execute: jest.fn().mockResolvedValue(true),
      } as unknown as IsValidPasswordUseCase,
      users,
      new RevokeAllSessionsForUserUseCase(refreshTokens),
      {
        execute: jest
          .fn()
          .mockResolvedValue({ localPasswordLoginEnabled: true }),
      } as unknown as GetOrgAuthenticationPolicyUseCase,
    );
    updatePassword = new UpdatePasswordUseCase(
      {
        execute: jest.fn().mockResolvedValue(true),
      } as unknown as CompareHashUseCase,
      users,
      hashText,
      new RevokeOtherSessionsForUserUseCase(refreshTokens),
      {
        get: jest.fn().mockReturnValue(actorRefreshToken),
      } as unknown as ContextService,
    );
  }

  async function seedPasswordState(): Promise<void> {
    await dataSource.getRepository(UserRecord).insert({
      id: userId,
      email: 'atomic-password@example.com',
      emailVerified: true,
      name: 'Atomic Password User',
      passwordHash: oldPasswordHash,
      role: UserRole.USER,
      systemRole: SystemRole.CUSTOMER,
      orgId,
      hasAcceptedMarketing: false,
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedAt: null,
    });
    await dataSource.getRepository(PasswordSetTokenRecord).insert({
      id: passwordTokenId,
      userId,
      tokenHash: sha256Hex(resetToken),
      purpose: PasswordSetTokenPurpose.RESET,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    await dataSource
      .getRepository(RefreshTokenRecord)
      .insert([
        refreshToken(actorTokenId, actorFamilyId, sha256Hex(actorRefreshToken)),
        refreshToken(otherTokenId, otherFamilyId, 'other-token-hash'),
      ]);
  }

  function refreshToken(id: UUID, familyId: UUID, tokenHash: string) {
    return {
      id,
      userId,
      familyId,
      tokenHash,
      authenticationMethod: SessionAuthenticationMethod.PASSWORD,
      zitadelSessionId: null,
      familyExpiresAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      revokedAt: null,
      replacedByTokenId: null,
    };
  }

  function resetPasswordCommand(): ResetPasswordCommand {
    return new ResetPasswordCommand(
      resetToken,
      'NewPassword123',
      'NewPassword123',
    );
  }

  function updatePasswordCommand(): UpdatePasswordCommand {
    return new UpdatePasswordCommand(
      userId,
      'CurrentPassword123',
      'NewPassword123',
      'NewPassword123',
    );
  }

  async function expectRevocationFailure(
    operation: () => Promise<void>,
  ): Promise<void> {
    await dataSource.query(`
      CREATE TRIGGER fail_refresh_revocation
      BEFORE UPDATE OF "revokedAt" ON "${schemaName}"."refresh_tokens"
      FOR EACH ROW EXECUTE FUNCTION "${schemaName}".fail_refresh_revocation()
    `);
    try {
      await expect(operation()).rejects.toThrow();
    } finally {
      await dataSource.query(
        `DROP TRIGGER fail_refresh_revocation ON "${schemaName}"."refresh_tokens"`,
      );
    }
  }

  async function expectPasswordAndToken(
    passwordHash: string,
    usedAt: unknown,
  ): Promise<void> {
    const user = await dataSource
      .getRepository(UserRecord)
      .findOneByOrFail({ id: userId });
    const token = await dataSource
      .getRepository(PasswordSetTokenRecord)
      .findOneByOrFail({ id: passwordTokenId });
    expect(user.passwordHash).toBe(passwordHash);
    expect(token.usedAt).toEqual(usedAt);
  }

  async function expectSessions(
    actorRevokedAt: unknown,
    otherRevokedAt: unknown,
  ): Promise<void> {
    const actor = await dataSource
      .getRepository(RefreshTokenRecord)
      .findOneByOrFail({ id: actorTokenId });
    const other = await dataSource
      .getRepository(RefreshTokenRecord)
      .findOneByOrFail({ id: otherTokenId });
    expect(actor.revokedAt).toEqual(actorRevokedAt);
    expect(other.revokedAt).toEqual(otherRevokedAt);
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
