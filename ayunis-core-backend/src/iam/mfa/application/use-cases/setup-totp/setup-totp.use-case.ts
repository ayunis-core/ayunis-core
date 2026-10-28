import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UserTotpsRepository } from 'src/iam/mfa/application/ports/user-totps.repository';
import { TotpSecretEncryptionPort } from 'src/iam/mfa/application/ports/totp-secret-encryption.port';
import { TotpPort } from 'src/iam/mfa/application/ports/totp.port';
import { UserTotp } from 'src/iam/mfa/domain/user-totp.entity';
import {
  MfaAlreadyEnabledError,
  UnexpectedMfaError,
} from 'src/iam/mfa/application/mfa.errors';
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

  @HandleUnexpectedErrors(UnexpectedMfaError, { databaseUnavailable: true })
  async execute(command: SetupTotpCommand): Promise<SetupTotpResult> {
    this.logger.log({ userId: command.userId }, 'setupTotp');

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
  }
}
