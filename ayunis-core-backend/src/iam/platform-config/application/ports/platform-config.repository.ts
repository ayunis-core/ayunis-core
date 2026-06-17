import type { PlatformConfigKey } from '../../domain/platform-config-keys.enum';
import type { PlatformConfig } from '../../domain/platform-config.entity';

export abstract class PlatformConfigRepositoryPort {
  abstract get(key: PlatformConfigKey): Promise<PlatformConfig | null>;
  abstract set(key: PlatformConfigKey, value: string): Promise<void>;
  /**
   * Atomically upsert a batch of platform-config rows in a single transaction.
   *
   * The argument is a `Map` rather than an array of `{key, value}` entries
   * because the underlying multi-row `INSERT … ON CONFLICT (key) DO UPDATE`
   * fails with Postgres error 21000 if two rows in the same statement share
   * the same key. The `Map` shape makes the "distinct keys" precondition
   * impossible to violate at the type level.
   */
  abstract setMany(entries: Map<PlatformConfigKey, string>): Promise<void>;
}
