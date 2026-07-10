import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { UserTotpsRepository } from '../../ports/user-totps.repository';
import { TotpSecretEncryptionPort } from '../../ports/totp-secret-encryption.port';
import { TotpPort } from '../../ports/totp.port';
import { UserTotp } from '../../../domain/user-totp.entity';
import { MfaAlreadyEnabledError, UnexpectedMfaError } from '../../mfa.errors';
import { SetupTotpCommand } from './setup-totp.command';

export interface SetupTotpResult {
  secret: string;
  otpauthUri: string;
  qrCodeDataUri: string;
}

@Injectable()
export class SetupTotpUseCase {
  private readonly logger = new Logger(SetupTotpUseCase.name);

  constructor(
    private readonly userTotpsRepository: UserTotpsRepository,
    private readonly totpSecretEncryption: TotpSecretEncryptionPort,
    private readonly totp: TotpPort,
  ) {}

  async execute(command: SetupTotpCommand): Promise<SetupTotpResult> {
    this.logger.log('setupTotp', { userId: command.userId });

    try {
      const existing = await this.userTotpsRepository.findByUserId(
        command.userId,
      );
      if (existing?.isConfirmed()) {
        throw new MfaAlreadyEnabledError();
      }

      const secret = this.totp.generateSecret();
      const encryptedSecret = await this.totpSecretEncryption.encrypt(secret);

      // An abandoned unconfirmed enrollment is simply overwritten.
      await this.userTotpsRepository.upsert(
        new UserTotp({
          id: existing?.id,
          userId: command.userId,
          encryptedSecret,
          createdAt: existing?.createdAt,
        }),
      );

      const otpauthUri = this.totp.buildOtpauthUri({
        label: command.email,
        secret,
      });
      const qrCodeDataUri = await this.totp.generateQrDataUri(otpauthUri);

      return { secret, otpauthUri, qrCodeDataUri };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error setting up TOTP', { error: error as Error });
      throw new UnexpectedMfaError(error);
    }
  }
}
