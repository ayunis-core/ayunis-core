import type { PlatformConfigKey } from '../../domain/platform-config-keys.enum';
import type { PlatformConfig } from '../../domain/platform-config.entity';

export abstract class PlatformConfigRepositoryPort {
  abstract get(key: PlatformConfigKey): Promise<PlatformConfig | null>;
  abstract set(key: PlatformConfigKey, value: string): Promise<void>;
}
