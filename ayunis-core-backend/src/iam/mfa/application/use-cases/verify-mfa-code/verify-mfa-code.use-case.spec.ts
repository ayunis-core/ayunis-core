import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { VerifyMfaCodeUseCase } from './verify-mfa-code.use-case';
import { VerifyMfaCodeCommand } from './verify-mfa-code.command';
import { UserTotpsRepository } from '../../ports/user-totps.repository';
import { MfaRecoveryCodesRepository } from '../../ports/mfa-recovery-codes.repository';
import { TotpSecretEncryptionPort } from '../../ports/totp-secret-encryption.port';
import { TotpPort } from '../../ports/totp.port';
import { CompareHashUseCase } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.use-case';
import { UserTotp } from 'src/iam/mfa/domain/user-totp.entity';
import { MfaRecoveryCode } from 'src/iam/mfa/domain/mfa-recovery-code.entity';
import {
  InvalidMfaCodeError,
  MfaLockedError,
  MfaNotEnabledError,
} from '../../mfa.errors';

describe('VerifyMfaCodeUseCase', () => {
  const userId = 'user-id-123' as UUID;
  let useCase: VerifyMfaCodeUseCase;
  let userTotps: jest.Mocked<
    Pick<
      UserTotpsRepository,
      | 'findByUserId'
      | 'markVerified'
      | 'registerFailedAttempt'
      | 'resetFailures'
    >
  >;
  let recoveryCodes: jest.Mocked<
    Pick<MfaRecoveryCodesRepository, 'findUnusedByUserId' | 'consume'>
  >;
  let encryption: jest.Mocked<Pick<TotpSecretEncryptionPort, 'decrypt'>>;
  let totp: jest.Mocked<Pick<TotpPort, 'verifyCode'>>;
  let compareHash: { execute: jest.Mock };

  const confirmedTotp = (overrides?: Partial<UserTotp>) =>
    new UserTotp({
      userId,
      encryptedSecret: 'encrypted',
      confirmedAt: new Date('2026-01-01'),
      ...overrides,
    });

  beforeAll(async () => {
    userTotps = {
      findByUserId: jest.fn(),
      markVerified: jest.fn(),
      registerFailedAttempt: jest.fn(),
      resetFailures: jest.fn(),
    };
    recoveryCodes = {
      findUnusedByUserId: jest.fn(),
      consume: jest.fn(),
    };
    encryption = { decrypt: jest.fn() };
    totp = { verifyCode: jest.fn() };
    compareHash = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyMfaCodeUseCase,
        { provide: UserTotpsRepository, useValue: userTotps },
        { provide: MfaRecoveryCodesRepository, useValue: recoveryCodes },
        { provide: TotpSecretEncryptionPort, useValue: encryption },
        { provide: TotpPort, useValue: totp },
        { provide: CompareHashUseCase, useValue: compareHash },
      ],
    }).compile();

    useCase = module.get(VerifyMfaCodeUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    encryption.decrypt.mockResolvedValue('secret');
    recoveryCodes.findUnusedByUserId.mockResolvedValue([]);
    userTotps.registerFailedAttempt.mockResolvedValue(1);
  });

  it('throws MfaNotEnabledError when the user has no TOTP', async () => {
    userTotps.findByUserId.mockResolvedValue(null);

    await expect(
      useCase.execute(new VerifyMfaCodeCommand(userId, '123456')),
    ).rejects.toThrow(MfaNotEnabledError);
  });

  it('throws MfaNotEnabledError when enrollment is unconfirmed', async () => {
    userTotps.findByUserId.mockResolvedValue(
      confirmedTotp({ confirmedAt: null }),
    );

    await expect(
      useCase.execute(new VerifyMfaCodeCommand(userId, '123456')),
    ).rejects.toThrow(MfaNotEnabledError);
  });

  it('throws MfaLockedError while locked', async () => {
    userTotps.findByUserId.mockResolvedValue(
      confirmedTotp({ lockedUntil: new Date(Date.now() + 60_000) }),
    );

    await expect(
      useCase.execute(new VerifyMfaCodeCommand(userId, '123456')),
    ).rejects.toThrow(MfaLockedError);
    expect(userTotps.registerFailedAttempt).not.toHaveBeenCalled();
  });

  it('succeeds for a valid TOTP code and records the counter', async () => {
    userTotps.findByUserId.mockResolvedValue(confirmedTotp());
    totp.verifyCode.mockResolvedValue(42);
    userTotps.markVerified.mockResolvedValue(true);

    await expect(
      useCase.execute(new VerifyMfaCodeCommand(userId, '123456')),
    ).resolves.toBeUndefined();
    expect(userTotps.markVerified).toHaveBeenCalledWith(userId, 42);
    expect(userTotps.registerFailedAttempt).not.toHaveBeenCalled();
  });

  it('verifies after an expired lock', async () => {
    userTotps.findByUserId.mockResolvedValue(
      confirmedTotp({ lockedUntil: new Date(Date.now() - 60_000) }),
    );
    totp.verifyCode.mockResolvedValue(42);
    userTotps.markVerified.mockResolvedValue(true);

    await expect(
      useCase.execute(new VerifyMfaCodeCommand(userId, '123456')),
    ).resolves.toBeUndefined();
  });

  it('treats a replayed TOTP code as a failure', async () => {
    userTotps.findByUserId.mockResolvedValue(confirmedTotp());
    totp.verifyCode.mockResolvedValue(42);
    userTotps.markVerified.mockResolvedValue(false);

    await expect(
      useCase.execute(new VerifyMfaCodeCommand(userId, '123456')),
    ).rejects.toThrow(InvalidMfaCodeError);
    expect(userTotps.registerFailedAttempt).toHaveBeenCalled();
  });

  it('counts a failed attempt for an invalid code', async () => {
    userTotps.findByUserId.mockResolvedValue(confirmedTotp());
    totp.verifyCode.mockResolvedValue(null);

    await expect(
      useCase.execute(new VerifyMfaCodeCommand(userId, '000000')),
    ).rejects.toThrow(InvalidMfaCodeError);
    expect(userTotps.registerFailedAttempt).toHaveBeenCalled();
  });

  it('locks after reaching the failure threshold', async () => {
    userTotps.findByUserId.mockResolvedValue(confirmedTotp());
    totp.verifyCode.mockResolvedValue(null);
    userTotps.registerFailedAttempt.mockResolvedValue(5);

    await expect(
      useCase.execute(new VerifyMfaCodeCommand(userId, '000000')),
    ).rejects.toThrow(MfaLockedError);
  });

  it('accepts a valid recovery code once', async () => {
    userTotps.findByUserId.mockResolvedValue(confirmedTotp());
    const code = new MfaRecoveryCode({ userId, codeHash: 'hash' });
    recoveryCodes.findUnusedByUserId.mockResolvedValue([code]);
    compareHash.execute.mockResolvedValue(true);
    recoveryCodes.consume.mockResolvedValue(true);

    await expect(
      useCase.execute(new VerifyMfaCodeCommand(userId, 'abcde-12345')),
    ).resolves.toBeUndefined();
    expect(recoveryCodes.consume).toHaveBeenCalledWith(
      code.id,
      expect.any(Date),
    );
    expect(userTotps.resetFailures).toHaveBeenCalledWith(userId);
  });

  it('rejects an already-consumed recovery code', async () => {
    userTotps.findByUserId.mockResolvedValue(confirmedTotp());
    const code = new MfaRecoveryCode({ userId, codeHash: 'hash' });
    recoveryCodes.findUnusedByUserId.mockResolvedValue([code]);
    compareHash.execute.mockResolvedValue(true);
    recoveryCodes.consume.mockResolvedValue(false);

    await expect(
      useCase.execute(new VerifyMfaCodeCommand(userId, 'ABCDE-12345')),
    ).rejects.toThrow(InvalidMfaCodeError);
  });

  it('rejects a non-matching recovery code', async () => {
    userTotps.findByUserId.mockResolvedValue(confirmedTotp());
    recoveryCodes.findUnusedByUserId.mockResolvedValue([
      new MfaRecoveryCode({ userId, codeHash: 'hash' }),
    ]);
    compareHash.execute.mockResolvedValue(false);

    await expect(
      useCase.execute(new VerifyMfaCodeCommand(userId, 'ABCDE-12345')),
    ).rejects.toThrow(InvalidMfaCodeError);
    expect(recoveryCodes.consume).not.toHaveBeenCalled();
  });
});
