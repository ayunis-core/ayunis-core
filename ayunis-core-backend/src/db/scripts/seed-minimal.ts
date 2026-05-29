import 'src/config/env';
import { randomUUID } from 'crypto';
import dataSource from 'src/db/datasource';
import { SeedRunner } from './utils/seed-runner';
import { minimalFixture, type ModelKey } from '../fixtures/minimal.fixture';
import { IsNull, MoreThanOrEqual } from 'typeorm';
import type { UUID } from 'crypto';

// Entity records
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import {
  LanguageModelRecord,
  EmbeddingModelRecord,
  ImageGenerationModelRecord,
} from 'src/domain/models/infrastructure/persistence/local-models/schema/model.record';
import {
  SeatBasedSubscriptionRecord,
  UsageBasedSubscriptionRecord,
} from 'src/iam/subscriptions/infrastructure/persistence/local/schema/subscription.record';
import { SubscriptionBillingInfoRecord } from 'src/iam/subscriptions/infrastructure/persistence/local/schema/subscription-billing-info.record';
import { PermittedModelRecord } from 'src/domain/models/infrastructure/persistence/local-permitted-models/schema/permitted-model.record';
import { PlatformConfigRecord } from 'src/iam/platform-config/infrastructure/persistence/postgres/schema/platform-config.record';
import { PlatformConfigKey } from 'src/iam/platform-config/domain/platform-config-keys.enum';
import { UsageRecord } from 'src/domain/usage/infrastructure/persistence/local-usage/schema/usage.record';
import type { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

const fixture = minimalFixture;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(entity: string, name: string, created: boolean): void {
  const icon = created ? '✅' : '⏭️ ';
  const verb = created ? 'Created' : 'Exists';
  console.log(`${icon} ${verb}: ${entity} (${name})`); // eslint-disable-line no-console
}

// ---------------------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------------------

async function seedOrgByName(name: string): Promise<OrgRecord> {
  const repo = dataSource.getRepository(OrgRecord);
  const existing = await repo.findOne({ where: { name } });
  if (existing) {
    log('Org', existing.name, false);
    return existing;
  }

  const record = repo.create({ id: randomUUID(), name });
  await repo.save(record);
  log('Org', record.name, true);
  return record;
}

async function seedLanguageModelFromFixture(
  entry: typeof fixture.languageModel | typeof fixture.azureLanguageModel,
): Promise<LanguageModelRecord> {
  const repo = dataSource.getRepository(LanguageModelRecord);
  const { name, displayName, provider, ...flags } = entry;
  const existing = await repo.findOne({ where: { name, provider } });
  if (existing) {
    log('Language model', existing.name, false);
    return existing;
  }

  const record = repo.create({
    id: randomUUID(),
    name,
    displayName,
    provider,
    ...flags,
  });
  await repo.save(record);
  log('Language model', record.name, true);
  return record;
}

async function seedEmbeddingModel(): Promise<EmbeddingModelRecord> {
  const repo = dataSource.getRepository(EmbeddingModelRecord);
  const { name, displayName, provider, dimensions } = fixture.embeddingModel;
  const existing = await repo.findOne({ where: { name, provider } });
  if (existing) {
    log('Embedding model', existing.name, false);
    return existing;
  }

  const record = repo.create({
    id: randomUUID(),
    name,
    displayName,
    provider,
    dimensions,
  });
  await repo.save(record);
  log('Embedding model', record.name, true);
  return record;
}

async function seedImageGenerationModel(): Promise<ImageGenerationModelRecord> {
  const repo = dataSource.getRepository(ImageGenerationModelRecord);
  const { name, displayName, provider, inputTokenCost, outputTokenCost } =
    fixture.imageGenerationModel;
  const existing = await repo.findOne({ where: { name, provider } });
  if (existing) {
    // Backfill pricing on envs seeded before image-gen cost fields existed,
    // so credit accounting produces non-zero credits for gpt-image-1.
    let dirty = false;
    if (existing.inputTokenCost === undefined) {
      existing.inputTokenCost = inputTokenCost;
      dirty = true;
    }
    if (existing.outputTokenCost === undefined) {
      existing.outputTokenCost = outputTokenCost;
      dirty = true;
    }
    if (dirty) {
      await repo.save(existing);
    }
    log('Image generation model', existing.name, dirty);
    return existing;
  }

  const record = repo.create({
    id: randomUUID(),
    name,
    displayName,
    provider,
    inputTokenCost,
    outputTokenCost,
  });
  await repo.save(record);
  log('Image generation model', record.name, true);
  return record;
}

// Manual find-or-create because password must be hashed before insert.
async function seedUser(
  orgId: string,
  runner: SeedRunner,
  userData: typeof fixture.user | typeof fixture.usageUser,
): Promise<UserRecord> {
  const repo = dataSource.getRepository(UserRecord);
  const existing = await repo.findOne({
    where: { email: userData.email },
  });

  if (existing) {
    log('User', existing.email, false);
    return existing;
  }

  const passwordHash = await runner.hashPassword(userData.password);
  const record = repo.create({
    id: randomUUID(),
    email: userData.email,
    passwordHash,
    orgId,
    name: userData.name,
    role: userData.role,
    systemRole: userData.systemRole,
    emailVerified: userData.emailVerified,
    hasAcceptedMarketing: userData.hasAcceptedMarketing,
  } as Partial<UserRecord>);
  await repo.save(record);
  log('User', record.email, true);
  return record;
}

async function seedSubscription(
  orgId: string,
): Promise<SeatBasedSubscriptionRecord> {
  const subRepo = dataSource.getRepository(SeatBasedSubscriptionRecord);
  const billingRepo = dataSource.getRepository(SubscriptionBillingInfoRecord);

  const existing = await subRepo.findOne({
    where: {
      orgId: orgId as `${string}-${string}-${string}-${string}-${string}`,
      cancelledAt: IsNull(),
    },
  });

  if (existing) {
    log('Subscription', `org=${orgId}`, false);
    return existing;
  }

  const subscriptionId = randomUUID();

  // Insert subscription first (FK target), then billing info
  const record = subRepo.create({
    id: subscriptionId,
    orgId,
    noOfSeats: fixture.subscription.noOfSeats,
    pricePerSeat: fixture.subscription.pricePerSeat,
    renewalCycle: fixture.subscription.renewalCycle,
    startsAt: new Date(),
    renewalCycleAnchor: new Date(),
    cancelledAt: null,
  } as Partial<SeatBasedSubscriptionRecord>);
  await subRepo.save(record);

  const billingInfo = billingRepo.create({
    id: randomUUID(),
    subscriptionId,
    ...fixture.subscription.billingInfo,
  } as Partial<SubscriptionBillingInfoRecord>);
  await billingRepo.save(billingInfo);

  record.billingInfo = billingInfo;
  log('Subscription', `org=${orgId}`, true);
  return record;
}

async function seedUsageSubscription(
  orgId: string,
): Promise<UsageBasedSubscriptionRecord> {
  const subRepo = dataSource.getRepository(UsageBasedSubscriptionRecord);
  const billingRepo = dataSource.getRepository(SubscriptionBillingInfoRecord);

  const existing = await subRepo.findOne({
    where: {
      orgId: orgId as `${string}-${string}-${string}-${string}-${string}`,
      cancelledAt: IsNull(),
    },
  });

  if (existing) {
    log('Usage subscription', `org=${orgId}`, false);
    return existing;
  }

  const subscriptionId = randomUUID();

  // Insert subscription first (FK target), then billing info
  const record = subRepo.create({
    id: subscriptionId,
    orgId,
    monthlyCredits: fixture.usageSubscription.monthlyCredits,
    startsAt: new Date(),
    cancelledAt: null,
  } as Partial<UsageBasedSubscriptionRecord>);
  await subRepo.save(record);

  const billingInfo = billingRepo.create({
    id: randomUUID(),
    subscriptionId,
    ...fixture.usageSubscription.billingInfo,
  } as Partial<SubscriptionBillingInfoRecord>);
  await billingRepo.save(billingInfo);

  record.billingInfo = billingInfo;
  log('Usage subscription', `org=${orgId}`, true);
  return record;
}

async function seedPermittedModels(
  orgId: string,
  models: Record<ModelKey, { id: string }>,
): Promise<void> {
  const repo = dataSource.getRepository(PermittedModelRecord);

  for (const pm of fixture.permittedModels) {
    const model = models[pm.modelKey];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for fixture integrity
    if (!model) {
      throw new Error(`Model key "${pm.modelKey}" not found in seeded models`);
    }

    type UUID = `${string}-${string}-${string}-${string}-${string}`;
    const modelId = model.id as UUID;
    const typedOrgId = orgId as UUID;

    const existing = await repo.findOne({
      where: { modelId, orgId: typedOrgId },
    });

    if (existing) {
      log(
        'Permitted model',
        `${pm.modelKey} (default=${String(pm.isDefault)})`,
        false,
      );
      continue;
    }

    const record = repo.create({
      id: randomUUID(),
      modelId,
      orgId: typedOrgId,
      isDefault: pm.isDefault,
      anonymousOnly: pm.anonymousOnly,
    });
    await repo.save(record);
    log(
      'Permitted model',
      `${pm.modelKey} (default=${String(pm.isDefault)})`,
      true,
    );
  }
}

async function seedPlatformConfig(): Promise<void> {
  const repo = dataSource.getRepository(PlatformConfigRecord);
  const key = PlatformConfigKey.CREDITS_PER_EURO;
  const existing = await repo.findOne({ where: { key } });

  if (existing) {
    log('Platform config', key, false);
    return;
  }

  const record = repo.create({
    key,
    value: String(fixture.platformConfig.creditsPerEuro),
  });
  await repo.save(record);
  log('Platform config', key, true);
}

interface UsageSeedModel {
  id: string;
  provider: ModelProvider;
  inputTokenCost?: number | null;
  outputTokenCost?: number | null;
}

/**
 * Seeds usage records across the current calendar month so the credit-based
 * usage views (admin + super admin) show non-empty charts and tables.
 * Idempotent: skips if the org already has usage in the current month.
 */
async function seedUsageRecords(
  orgId: string,
  userId: string,
  usageModels: UsageSeedModel[],
): Promise<void> {
  const repo = dataSource.getRepository(UsageRecord);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const existing = await repo.count({
    where: {
      organizationId: orgId as UUID,
      createdAt: MoreThanOrEqual(monthStart),
    },
  });
  if (existing > 0) {
    log('Usage records', `org=${orgId}`, false);
    return;
  }

  const creditsPerEuro = fixture.platformConfig.creditsPerEuro;
  const today = now.getDate();
  const rows: Record<string, unknown>[] = [];

  let index = 0;
  // One record every other day up to today, cycling through models/providers.
  for (let day = 1; day <= today; day += 2) {
    const model = usageModels[index % usageModels.length];
    // Deterministic but varied token counts.
    const inputTokens = 40_000 + ((index * 7919) % 120_000);
    const outputTokens = 20_000 + ((index * 5003) % 80_000);
    const totalTokens = inputTokens + outputTokens;
    const cost =
      (inputTokens / 1_000_000) * (model.inputTokenCost ?? 0) +
      (outputTokens / 1_000_000) * (model.outputTokenCost ?? 0);
    const creditsConsumed = cost * creditsPerEuro;
    const createdAt = new Date(
      now.getFullYear(),
      now.getMonth(),
      day,
      10,
      0,
      0,
    );

    rows.push({
      id: randomUUID(),
      userId: userId,
      apiKeyId: null,
      organizationId: orgId,
      modelId: model.id,
      provider: model.provider,
      inputTokens,
      outputTokens,
      totalTokens,
      cost,
      creditsConsumed,
      requestId: randomUUID(),
      createdAt,
      updatedAt: createdAt,
    });
    index += 1;
  }

  if (rows.length === 0) {
    log('Usage records', `org=${orgId} (none — day 1)`, true);
    return;
  }

  // QueryBuilder insert honors the explicit createdAt (CreateDateColumn would
  // otherwise overwrite it with the current timestamp).
  await dataSource
    .createQueryBuilder()
    .insert()
    .into(UsageRecord)
    .values(rows)
    .execute();
  log('Usage records', `org=${orgId} (${rows.length})`, true);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedAllFixtures(runner: SeedRunner): Promise<void> {
  console.log('🌱 Starting minimal seed…\n'); // eslint-disable-line no-console

  const [
    org,
    usageOrg,
    languageModel,
    azureLanguageModel,
    embeddingModel,
    imageGenerationModel,
  ] = await Promise.all([
    seedOrgByName(fixture.org.name),
    seedOrgByName(fixture.usageOrg.name),
    seedLanguageModelFromFixture(fixture.languageModel),
    seedLanguageModelFromFixture(fixture.azureLanguageModel),
    seedEmbeddingModel(),
    seedImageGenerationModel(),
  ]);

  const models = {
    languageModel,
    azureLanguageModel,
    embeddingModel,
    imageGenerationModel,
  };

  const adminUser = await seedUser(org.id, runner, fixture.user);
  await seedSubscription(org.id);
  await seedPermittedModels(org.id, models);

  const usageAdminUser = await seedUser(usageOrg.id, runner, fixture.usageUser);
  await seedUsageSubscription(usageOrg.id);
  await seedPermittedModels(usageOrg.id, models);

  await seedPlatformConfig();

  const usageModels: UsageSeedModel[] = [
    languageModel,
    azureLanguageModel,
    imageGenerationModel,
  ];
  await seedUsageRecords(org.id, adminUser.id, usageModels);
  await seedUsageRecords(usageOrg.id, usageAdminUser.id, usageModels);

  console.log('\n🎉 Minimal seed completed successfully!'); // eslint-disable-line no-console
}

async function seedMinimal(): Promise<void> {
  const runner = new SeedRunner();
  const shouldClean = process.argv.includes('--clean');
  let exitCode = 0;

  try {
    runner.ensureNonProduction();
    await runner.initialize();

    if (shouldClean) {
      await runner.truncateAll();
    }

    await seedAllFixtures(runner);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    exitCode = 1;
  } finally {
    await runner.destroy();
  }

  process.exit(exitCode);
}

if (require.main === module) {
  void seedMinimal();
}

export { seedMinimal };
