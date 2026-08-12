import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { SsoBrokerNotConfiguredError } from 'src/iam/sso/application/sso.errors';
import { SsoLoginTransactionEncryptionPort } from 'src/iam/sso/application/ports/sso-login-transaction-encryption.port';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

@Injectable()
export class SsoLoginTransactionEncryptionService extends SsoLoginTransactionEncryptionPort {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  encrypt(value: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key(), iv);
    const ciphertext = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([iv, ciphertext, cipher.getAuthTag()]).toString(
      'base64url',
    );
  }

  decrypt(value: string): string {
    const payload = Buffer.from(value, 'base64url');
    const iv = payload.subarray(0, IV_BYTES);
    const tag = payload.subarray(payload.length - AUTH_TAG_BYTES);
    const ciphertext = payload.subarray(IV_BYTES, -AUTH_TAG_BYTES);
    const decipher = createDecipheriv(ALGORITHM, this.key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }

  private key(): Buffer {
    const keyHex = this.configService.get<string>(
      'SSO_LOGIN_TRANSACTION_ENCRYPTION_KEY',
    );
    if (!keyHex) {
      throw new SsoBrokerNotConfiguredError();
    }
    return Buffer.from(keyHex, 'hex');
  }
}
