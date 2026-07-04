/**
 * Encrypts TOTP secrets for storage at rest.
 */
export abstract class TotpSecretEncryptionPort {
  abstract encrypt(plaintext: string): Promise<string>;
  abstract decrypt(ciphertext: string): Promise<string>;
}
