/**
 * Encrypts connector credentials for storage at rest. Plaintext credentials
 * never leave the connectors module.
 */
export abstract class ConnectorCredentialEncryptionPort {
  abstract encrypt(plaintext: string): Promise<string>;

  /** Rejects ciphertext that was altered or encrypted under another key. */
  abstract decrypt(ciphertext: string): Promise<string>;
}
