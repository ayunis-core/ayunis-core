import 'src/config/env';
import { SeedRunner } from 'src/db/scripts/utils/seed-runner';
import { logLine } from 'src/db/scripts/utils/seed-log';
import { SeedState } from './seed-state';
import type { GlobalSeeder, OrgSeeder } from './seeders/base-seeder';
import { ModelSeeder } from './seeders/model-seeder';
import { PlatformConfigSeeder } from './seeders/platform-config-seeder';
import { OrgUserSeeder } from './seeders/org-user-seeder';
import { BillingSeeder } from './seeders/billing-seeder';
import { UsageSeeder } from './seeders/usage-seeder';
import { CreditLimitSeeder } from './seeders/credit-limit-seeder';

export class SeedManager {
  private readonly globalSeeders: GlobalSeeder[] = [
    new ModelSeeder(),
    new PlatformConfigSeeder(),
  ];

  private readonly orgSeeders: OrgSeeder[] = [
    new OrgUserSeeder(),
    new BillingSeeder(),
    new UsageSeeder(),
    new CreditLimitSeeder(),
  ];

  constructor(private readonly runner: SeedRunner) {}

  static async run(): Promise<void> {
    const runner = new SeedRunner();
    const shouldClean = process.argv.includes('--clean');
    let exitCode = 0;

    try {
      runner.ensureNonProduction();
      await runner.initialize();

      if (shouldClean) {
        await runner.truncateAll();
      }

      await new SeedManager(runner).seed();
    } catch (error) {
      console.error('\n❌ Seed failed:', error);
      exitCode = 1;
    } finally {
      await runner.destroy();
    }

    process.exit(exitCode);
  }

  async seed(): Promise<void> {
    logLine('🌱 Starting minimal seed…\n');
    const ctx = new SeedState(this.runner);

    for (const seeder of this.globalSeeders) {
      await seeder.seed(ctx);
    }

    for (const org of ctx.fixture.orgs) {
      for (const seeder of this.orgSeeders) {
        await seeder.seedForOrg(ctx, org);
      }
    }

    logLine('\n🎉 Minimal seed completed successfully!');
  }
}

if (require.main === module) {
  void SeedManager.run();
}
