export abstract class SsoLoginTransactionEncryptionPort {
  abstract encrypt(value: string): string;
  abstract decrypt(value: string): string;
}
