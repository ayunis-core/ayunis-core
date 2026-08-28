export abstract class SsoEncryptionPort {
  abstract encrypt(value: string): string;
  abstract decrypt(value: string): string;
}
