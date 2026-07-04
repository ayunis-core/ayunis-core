import { Injectable, Logger } from '@nestjs/common';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import type { OtpauthUriParams } from '../../application/ports/totp.port';
import { TotpPort } from '../../application/ports/totp.port';
import { TOTP_ISSUER, TOTP_WINDOW } from '../../domain/mfa.constants';

const TOTP_CODE_PATTERN = /^\d{6}$/;

@Injectable()
export class OtplibTotpAdapter extends TotpPort {
  private readonly logger = new Logger(OtplibTotpAdapter.name);
  private readonly authenticator = authenticator.clone({
    window: TOTP_WINDOW,
  });

  generateSecret(): string {
    return this.authenticator.generateSecret();
  }

  buildOtpauthUri(params: OtpauthUriParams): string {
    return this.authenticator.keyuri(params.label, TOTP_ISSUER, params.secret);
  }

  async generateQrDataUri(otpauthUri: string): Promise<string> {
    return toDataURL(otpauthUri);
  }

  async verifyCode(secret: string, code: string): Promise<number | null> {
    const token = code.trim();
    if (!TOTP_CODE_PATTERN.test(token)) {
      return Promise.resolve(null);
    }

    try {
      // Delta is the offset (in periods) between the matched code and the
      // current period; combining it with the current time step yields the
      // absolute counter used for replay tracking.
      const delta = this.authenticator.checkDelta(token, secret);
      if (delta === null) {
        return Promise.resolve(null);
      }

      const { step, epoch } = this.authenticator.allOptions();
      const currentCounter = Math.floor(epoch / 1000 / step);
      return Promise.resolve(currentCounter + delta);
    } catch (error) {
      this.logger.warn('TOTP verification errored', { error });
      return Promise.resolve(null);
    }
  }
}
