import type { StorageUrl } from './storage-url.entity';

export class PresignedUrl {
  readonly url: string;
  readonly expiresAt: Date;
  readonly storageUrl: StorageUrl;

  constructor(url: string, expiresIn: number, storageUrl: StorageUrl) {
    this.url = url;
    this.expiresAt = new Date(Date.now() + expiresIn * 1000);
    this.storageUrl = storageUrl;
  }

  isExpired(): boolean {
    return this.expiresAt.getTime() < Date.now();
  }
}
