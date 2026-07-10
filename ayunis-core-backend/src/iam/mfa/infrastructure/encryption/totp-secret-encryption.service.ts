import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { TotpSecretEncryptionPort } from '../../application/ports/totp-secret-encryption.port';

/**
 * Encrypts TOTP secrets at rest using AES-256-GCM.
 *
 * The key is read from the MFA_ENCRYPTION_KEY environment variable
 * (64 hex characters = 32 bytes). Output format: base64(iv + ciphertext +
 * authTag), matching the credential-encryption format used elsewhere.
 */
@Injectable()
export class TotpSecretEncryptionService extends TotpSecretEncryptionPort {
  private readonly logger = new Logger(TotpSecretEncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;
  private readonly authTagLength = 16;
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    super();

    const keyHex = this.configService.get<string>('MFA_ENCRYPTION_KEY');

    if (!keyHex || keyHex.trim() === '') {
      throw new Error(
        'MFA_ENCRYPTION_KEY environment variable is not configured. ' +
          'Generate a key with: openssl rand -hex 32',
      );
    }

    if (keyHex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
      throw new Error(
        'MFA_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
          'Generate a key with: openssl rand -hex 32',
      );
    }

    this.encryptionKey = Buffer.from(keyHex, 'hex');
  }

  async encrypt(plaintext: string): Promise<string> {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );

      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      const combined = Buffer.concat([iv, encrypted, authTag]);
      return Promise.resolve(combined.toString('base64'));
    } catch (error) {
      this.logger.error('Failed to encrypt TOTP secret', {
        error: error as Error,
      });
      throw new Error('Failed to encrypt TOTP secret');
    }
  }

  async decrypt(ciphertext: string): Promise<string> {
    try {
      const combined = Buffer.from(ciphertext, 'base64');

      if (combined.length < this.ivLength + this.authTagLength) {
        throw new Error('Ciphertext is too short');
      }

      const iv = combined.subarray(0, this.ivLength);
      const authTag = combined.subarray(-this.authTagLength);
      const encrypted = combined.subarray(this.ivLength, -this.authTagLength);

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return Promise.resolve(decrypted.toString('utf8'));
    } catch (error) {
      this.logger.error('Failed to decrypt TOTP secret', {
        error: error as Error,
      });
      throw new Error('Failed to decrypt TOTP secret');
    }
  }
}
