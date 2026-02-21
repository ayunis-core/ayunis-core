import 'src/config/env';
import { randomUUID } from 'crypto';
import dataSource from 'src/db/datasource';
import { SeedRunner } from './utils/seed-runner';
import { minimalFixture, type ModelKey } from '../fixtures/minimal.fixture';
import { IsNull } from 'typeorm';

// Entity records
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import {
  LanguageModelRecord,
  EmbeddingModelRecord,
} from 'src/domain/models/infrastructure/persistence/local-models/schema/model.record';
import { SubscriptionRecord } from 'src/iam/subscriptions/infrastructure/persistence/local/schema/subscription.record';
import { SubscriptionBillingInfoRecord } from 'src/iam/subscriptions/infrastructure/persistence/local/schema/subscription-billing-info.record';
import { PermittedModelRecord } from 'src/domain/models/infrastructure/persistence/local-permitted-models/schema/permitted-model.record';

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

async function seedOrg(): Promise<OrgRecord> {
  const repo = dataSource.getRepository(OrgRecord);
  const existing = await repo.findOne({ where: { name: fixture.org.name } });
  if (existing) {
    log('Org', existing.name, false);
    return existing;
  }

  const record = repo.create({ id: randomUUID(), name: fixture.org.name });
  await repo.save(record);
  log('Org', record.name, true);
  return record;
}

async function seedLanguageModel(): Promise<LanguageModelRecord> {
  const repo = dataSource.getRepository(LanguageModelRecord);
  const { name, displayName, provider, ...flags } = fixture.languageModel;
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

// Manual find-or-create because password must be hashed before insert.
async function seedUser(
  orgId: string,
  runner: SeedRunner,
): Promise<UserRecord> {
  const repo = dataSource.getRepository(UserRecord);
  const existing = await repo.findOne({
    where: { email: fixture.user.email },
  });

  if (existing) {
    log('User', existing.email, false);
    return existing;
  }

  const passwordHash = await runner.hashPassword(fixture.user.password);
  const record = repo.create({
    id: randomUUID(),
    email: fixture.user.email,
    passwordHash,
    orgId,
    name: fixture.user.name,
    role: fixture.user.role,
    systemRole: fixture.user.systemRole,
    emailVerified: fixture.user.emailVerified,
    hasAcceptedMarketing: fixture.user.hasAcceptedMarketing,
  } as Partial<UserRecord>);
  await repo.save(record);
  log('User', record.email, true);
  return record;
}

async function seedSubscription(orgId: string): Promise<SubscriptionRecord> {
  const subRepo = dataSource.getRepository(SubscriptionRecord);
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
  const billingInfo = billingRepo.create({
    id: randomUUID(),
    subscriptionId,
    ...fixture.subscription.billingInfo,
  } as Partial<SubscriptionBillingInfoRecord>);

  const record = subRepo.create({
    id: subscriptionId,
    orgId,
    noOfSeats: fixture.subscription.noOfSeats,
    pricePerSeat: fixture.subscription.pricePerSeat,
    renewalCycle: fixture.subscription.renewalCycle,
    renewalCycleAnchor: new Date(),
    billingInfo,
    cancelledAt: null,
  } as Partial<SubscriptionRecord>);
  await subRepo.save(record);
  log('Subscription', `org=${orgId}`, true);
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

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

    console.log('🌱 Starting minimal seed…\n'); // eslint-disable-line no-console

    // Seed independent entities first
    const [org, languageModel, embeddingModel] = await Promise.all([
      seedOrg(),
      seedLanguageModel(),
      seedEmbeddingModel(),
    ]);

    // Seed entities that depend on org
    await seedUser(org.id, runner);
    await seedSubscription(org.id);
    await seedPermittedModels(org.id, { languageModel, embeddingModel });

    console.log('\n🎉 Minimal seed completed successfully!'); // eslint-disable-line no-console
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
