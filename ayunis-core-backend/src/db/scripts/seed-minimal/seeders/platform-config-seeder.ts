import { PlatformConfigRecord } from 'src/iam/platform-config/infrastructure/persistence/postgres/schema/platform-config.record';
import { PlatformConfigKey } from 'src/iam/platform-config/domain/platform-config-keys.enum';
import { GlobalSeeder } from './base-seeder';
import type { SeedState } from '../seed-state';

export class PlatformConfigSeeder extends GlobalSeeder {
  async seed(ctx: SeedState): Promise<void> {
    const key = PlatformConfigKey.CREDITS_PER_EURO;
    await this.findOrCreate(
      this.repo(PlatformConfigRecord),
      { key },
      () => ({ key, value: String(ctx.fixture.platformConfig.creditsPerEuro) }),
      { entity: 'Platform config', name: key },
    );
  }
}
