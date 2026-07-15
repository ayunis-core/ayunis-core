import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { HashTextUseCase } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.use-case';
import { HashTextCommand } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.command';
import { UserTotpsRepository } from '../../ports/user-totps.repository';
import { MfaRecoveryCodesRepository } from '../../ports/mfa-recovery-codes.repository';
import { TotpSecretEncryptionPort } from '../../ports/totp-secret-encryption.port';
import { TotpPort } from '../../ports/totp.port';
import { MfaRecoveryCode } from '../../../domain/mfa-recovery-code.entity';
import { RECOVERY_CODE_COUNT } from '../../../domain/mfa.constants';
import { generateRecoveryCode } from '../../../domain/recovery-code.generator';
import {
  InvalidMfaCodeError,
  MfaAlreadyEnabledError,
  MfaNotEnabledError,
  UnexpectedMfaError,
} from '../../mfa.errors';
import { ConfirmTotpCommand } from './confirm-totp.command';

@Injectable()
export class ConfirmTotpUseCase {
  private readonly logger = new Logger(ConfirmTotpUseCase.name);

  constructor(
    private readonly userTotpsRepository: UserTotpsRepository,
    private readonly recoveryCodesRepository: MfaRecoveryCodesRepository,
    private readonly totpSecretEncryption: TotpSecretEncryptionPort,
    private readonly totp: TotpPort,
    private readonly hashTextUseCase: HashTextUseCase,
  ) {}

  /** Confirms a pending enrollment and returns the plaintext recovery codes. */
  @HandleUnexpectedErrors(UnexpectedMfaError)
  async execute(command: ConfirmTotpCommand): Promise<string[]> {
    this.logger.log('confirmTotp', { userId: command.userId });

    const totp = await this.userTotpsRepository.findByUserId(command.userId);
    if (!totp) {
      throw new MfaNotEnabledError();
    }
    if (totp.isConfirmed()) {
      throw new MfaAlreadyEnabledError();
    }

    const secret = await this.totpSecretEncryption.decrypt(
      totp.encryptedSecret,
    );
    const counter = await this.totp.verifyCode(secret, command.code);
    if (counter === null) {
      throw new InvalidMfaCodeError();
    }

    // Codes are written before the totp is confirmed: codes without a
    // confirmed totp are inert (verification requires confirmation), while
    // a confirmed totp without codes would leave the user unable to ever
    // retrieve recovery codes.
    const codes = await this.issueRecoveryCodes(command.userId);

    totp.confirmedAt = new Date();
    totp.lastUsedCounter = counter;
    totp.failedAttempts = 0;
    totp.lockedUntil = null;
    await this.userTotpsRepository.upsert(totp);

    return codes;
  }

  private async issueRecoveryCodes(
    userId: ConfirmTotpCommand['userId'],
  ): Promise<string[]> {
    const codes = Array.from(
      { length: RECOVERY_CODE_COUNT },
      generateRecoveryCode,
    );

    const records = await Promise.all(
      codes.map(async (code) => {
        const codeHash = await this.hashTextUseCase.execute(
          new HashTextCommand(code),
        );
        return new MfaRecoveryCode({ userId, codeHash });
      }),
    );

    await this.recoveryCodesRepository.replaceForUser(userId, records);
    return codes;
  }
}
