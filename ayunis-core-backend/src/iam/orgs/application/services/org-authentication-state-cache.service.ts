import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';

interface CacheEntry {
  expiresAt: number;
  version: Promise<number>;
}
const TTL_MS = 30_000;
const MAX_ENTRIES = 1_000;

@Injectable()
export class OrgAuthenticationStateCacheService {
  private readonly entries = new Map<UUID, CacheEntry>();

  async invalidateIfVersion(orgId: UUID, version: number): Promise<void> {
    const entry = this.entries.get(orgId);
    if (
      entry &&
      (await entry.version) === version &&
      this.entries.get(orgId) === entry
    ) {
      this.entries.delete(orgId);
    }
  }

  getOrLoad(orgId: UUID, load: () => Promise<number>): Promise<number> {
    const now = Date.now();
    const cached = this.entries.get(orgId);
    if (cached && cached.expiresAt > now) return cached.version;
    this.entries.delete(orgId);
    if (this.entries.size >= MAX_ENTRIES) {
      const oldest = this.entries.keys().next().value;
      if (oldest) this.entries.delete(oldest);
    }
    // Start expiry before the read so slow reads cannot extend revocation delay.
    const entry: CacheEntry = {
      expiresAt: now + TTL_MS,
      version: Promise.resolve().then(load),
    };
    this.entries.set(orgId, entry);
    void entry.version.catch(() => {
      if (this.entries.get(orgId) === entry) this.entries.delete(orgId);
    });
    return entry.version;
  }
}
