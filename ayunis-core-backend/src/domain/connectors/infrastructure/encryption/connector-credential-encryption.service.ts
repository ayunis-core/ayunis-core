import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ConnectorCredentialEncryptionPort } from 'src/domain/connectors/application/ports/connector-credential-encryption.port';

/**
 * AES-256-GCM under CONNECTOR_ENCRYPTION_KEY (64 hex characters). Output:
 * base64(iv + ciphertext + authTag), the format of the MCP credentials.
 *
 * The key is only required while connectors are enabled, which the
 * environment validation enforces at boot; without it this service fails on
 * use instead of preventing every other module from starting.
 */
@Injectable()
export class ConnectorCredentialEncryptionService extends ConnectorCredentialEncryptionPort {
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;
  private readonly authTagLength = 16;
  private readonly encryptionKey: Buffer | null;

  constructor(configService: ConfigService) {
    super();
    const keyHex = configService
      .get<string>('CONNECTOR_ENCRYPTION_KEY')
      ?.trim();
    this.encryptionKey = keyHex ? Buffer.from(keyHex, 'hex') : null;
  }

  encrypt(plaintext: string): Promise<string> {
    return Promise.resolve().then(() => this.seal(plaintext));
  }

  decrypt(ciphertext: string): Promise<string> {
    return Promise.resolve().then(() => this.open(ciphertext));
  }

  private seal(plaintext: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.requireKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([iv, encrypted, cipher.getAuthTag()]).toString(
      'base64',
    );
  }

  private open(ciphertext: string): string {
    const key = this.requireKey();
    const combined = Buffer.from(ciphertext, 'base64');
    if (combined.length < this.ivLength + this.authTagLength) {
      throw new Error('Connector credential ciphertext is too short');
    }
    const iv = combined.subarray(0, this.ivLength);
    const authTag = combined.subarray(-this.authTagLength);
    const encrypted = combined.subarray(this.ivLength, -this.authTagLength);
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }

  private requireKey(): Buffer {
    if (!this.encryptionKey) {
      throw new Error(
        'CONNECTOR_ENCRYPTION_KEY is not configured. ' +
          'Generate a key with: openssl rand -hex 32',
      );
    }
    return this.encryptionKey;
  }
}
