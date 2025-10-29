/**
 * Port interface for encrypting and decrypting MCP integration credentials.
 *
 * Implementations must provide secure encryption at rest using AES-256-GCM
 * with a key stored in environment variables. Credentials are encrypted
 * before storage and decrypted only when needed for MCP client connections.
 */
export abstract class McpCredentialEncryptionPort {
  /**
   * Encrypts plaintext credentials using AES-256-GCM.
   *
   * @param plaintext - The credential value to encrypt (API key, bearer token, etc.)
   * @returns Promise resolving to base64-encoded encrypted value (includes IV and auth tag)
   * @throws Error if encryption key is not configured or encryption fails
   */
  abstract encrypt(plaintext: string): Promise<string>;

  /**
   * Decrypts encrypted credentials back to plaintext.
   *
   * @param ciphertext - The base64-encoded encrypted value (includes IV and auth tag)
   * @returns Promise resolving to original plaintext credential
   * @throws Error if decryption fails (invalid ciphertext, wrong key, corrupted data)
   */
  abstract decrypt(ciphertext: string): Promise<string>;
}
