import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
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

  @HandleUnexpectedErrors(UnexpectedMfaError)
  async execute(command: SetupTotpCommand): Promise<SetupTotpResult> {
    this.logger.log('setupTotp', { userId: command.userId });

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
