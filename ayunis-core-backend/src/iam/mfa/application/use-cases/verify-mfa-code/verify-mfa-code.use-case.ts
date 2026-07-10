import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { CompareHashUseCase } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.use-case';
import { CompareHashCommand } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.command';
import { UserTotpsRepository } from '../../ports/user-totps.repository';
import { MfaRecoveryCodesRepository } from '../../ports/mfa-recovery-codes.repository';
import { TotpSecretEncryptionPort } from '../../ports/totp-secret-encryption.port';
import { TotpPort } from '../../ports/totp.port';
import type { UserTotp } from '../../../domain/user-totp.entity';
import {
  LOCK_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
} from '../../../domain/mfa.constants';
import { RECOVERY_CODE_PATTERN } from '../../../domain/recovery-code.generator';
import {
  InvalidMfaCodeError,
  MfaLockedError,
  MfaNotEnabledError,
  UnexpectedMfaError,
} from '../../mfa.errors';
import { VerifyMfaCodeCommand } from './verify-mfa-code.command';

const TOTP_CODE_PATTERN = /^\d{6}$/;

/**
 * Shared verification core for login-time MFA and code-guarded settings
 * operations. Succeeds silently; throws on any failure. Failed attempts are
 * counted per user in the database and lock MFA after MAX_FAILED_ATTEMPTS.
 */
@Injectable()
export class VerifyMfaCodeUseCase {
  private readonly logger = new Logger(VerifyMfaCodeUseCase.name);

  constructor(
    private readonly userTotpsRepository: UserTotpsRepository,
    private readonly recoveryCodesRepository: MfaRecoveryCodesRepository,
    private readonly totpSecretEncryption: TotpSecretEncryptionPort,
    private readonly totp: TotpPort,
    private readonly compareHashUseCase: CompareHashUseCase,
  ) {}

  async execute(command: VerifyMfaCodeCommand): Promise<void> {
    this.logger.log('verifyMfaCode', { userId: command.userId });

    try {
      const totp = await this.userTotpsRepository.findByUserId(command.userId);
      if (!totp?.isConfirmed()) {
        throw new MfaNotEnabledError();
      }

      const now = new Date();
      if (totp.isLocked(now) && totp.lockedUntil) {
        throw new MfaLockedError(totp.lockedUntil);
      }

      const verified =
        (await this.tryTotpCode(totp, command.code)) ||
        (await this.tryRecoveryCode(command.userId, command.code, now));

      if (!verified) {
        await this.registerFailure(command.userId, now);
      }
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error verifying MFA code', { error: error as Error });
      throw new UnexpectedMfaError(error);
    }
  }

  private async tryTotpCode(totp: UserTotp, code: string): Promise<boolean> {
    if (!TOTP_CODE_PATTERN.test(code.trim())) {
      return false;
    }

    const secret = await this.totpSecretEncryption.decrypt(
      totp.encryptedSecret,
    );
    const counter = await this.totp.verifyCode(secret, code);
    if (counter === null) {
      return false;
    }

    // False when the time step was already consumed (replay).
    return this.userTotpsRepository.markVerified(totp.userId, counter);
  }

  private async tryRecoveryCode(
    userId: UUID,
    code: string,
    now: Date,
  ): Promise<boolean> {
    const normalized = code.trim().toUpperCase();
    if (!RECOVERY_CODE_PATTERN.test(normalized)) {
      return false;
    }

    const candidates =
      await this.recoveryCodesRepository.findUnusedByUserId(userId);

    for (const candidate of candidates) {
      const matches = await this.compareHashUseCase.execute(
        new CompareHashCommand(normalized, candidate.codeHash),
      );
      if (
        matches &&
        (await this.recoveryCodesRepository.consume(candidate.id, now))
      ) {
        await this.userTotpsRepository.resetFailures(userId);
        return true;
      }
    }

    return false;
  }

  private async registerFailure(userId: UUID, now: Date): Promise<never> {
    const lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS);
    const failures = await this.userTotpsRepository.registerFailedAttempt(
      userId,
      MAX_FAILED_ATTEMPTS,
      lockedUntil,
    );

    if (failures >= MAX_FAILED_ATTEMPTS) {
      this.logger.warn('MFA locked after repeated failures', { userId });
      throw new MfaLockedError(lockedUntil);
    }
    throw new InvalidMfaCodeError();
  }
}
