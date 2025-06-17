/**
 * Abstract handler for password hashing operations.
 * Following hexagonal architecture pattern, this defines the port
 * that concrete implementations will adapt to.
 */
export abstract class HashingHandler {
  /**
   * Hashes a plain text password
   * @param plainText The plain text password to hash
   * @returns A promise that resolves to the hashed password
   */
  abstract hash(plainText: string): Promise<string>;

  /**
   * Compares a plain text password with a hash to verify if they match
   * @param plainText The plain text password to compare
   * @param hash The hash to compare against
   * @returns A promise that resolves to a boolean indicating if the passwords match
   */
  abstract compare(plainText: string, hash: string): Promise<boolean>;
}
