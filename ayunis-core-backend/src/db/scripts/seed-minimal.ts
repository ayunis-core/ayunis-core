import 'dotenv/config';
import { randomUUID } from 'crypto';
import dataSource from 'src/db/datasource';
import { SeedRunner } from './utils/seed-runner';
import { minimalFixture } from '../fixtures/minimal.fixture';
import { IsNull } from 'typeorm';

// Import TypeORM entities (records)
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { LanguageModelRecord } from 'src/domain/models/infrastructure/persistence/local-models/schema/model.record';
import { SubscriptionRecord } from 'src/iam/subscriptions/infrastructure/persistence/local/schema/subscription.record';
import { SubscriptionBillingInfoRecord } from 'src/iam/subscriptions/infrastructure/persistence/local/schema/subscription-billing-info.record';
import { PermittedModelRecord } from 'src/domain/models/infrastructure/persistence/local-permitted-models/schema/permitted-model.record';

// Import enums
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';

/**
 * Seed minimal data for development and E2E testing
 *
 * Creates:
 * - 1 organization (Demo Org)
 * - 1 admin user (admin@demo.local)
 * - 1 language model (gpt-4o-mini)
 * - 1 active subscription
 * - Permitted model for the org
 */
async function seedMinimal() {
  const runner = new SeedRunner();

  try {
    // Ensure we're not in production
    runner.ensureNonProduction();

    await runner.initialize();
    console.log('🌱 Starting minimal seed...\n');

    // Get TypeORM repositories (direct access, no NestJS DI)
    const orgRepo = dataSource.getRepository(OrgRecord);
    const userRepo = dataSource.getRepository(UserRecord);
    const modelRepo = dataSource.getRepository(LanguageModelRecord);
    const subscriptionRepo = dataSource.getRepository(SubscriptionRecord);
    const billingInfoRepo = dataSource.getRepository(
      SubscriptionBillingInfoRecord,
    );
    const permittedModelRepo = dataSource.getRepository(PermittedModelRecord);

    // 1. Create model
    let model = await modelRepo.findOne({
      where: {
        name: minimalFixture.model.name,
        provider: ModelProvider.OPENAI,
      },
    });

    if (!model) {
      model = modelRepo.create({
        id: randomUUID(),
        name: minimalFixture.model.name,
        displayName: minimalFixture.model.displayName,
        provider: ModelProvider.OPENAI,
        canStream: minimalFixture.model.canStream,
        isReasoning: minimalFixture.model.isReasoning,
        isArchived: minimalFixture.model.isArchived,
        canUseTools: minimalFixture.model.canUseTools,
        canVision: minimalFixture.model.canVision,
      });
      await modelRepo.save(model);
      console.log(`✅ Created model: ${model.name}`);
    } else {
      console.log(`⏭️  Model already exists: ${model.name}`);
    }

    // 2. Create organization
    let org = await orgRepo.findOne({
      where: { name: minimalFixture.org.name },
    });

    if (!org) {
      org = orgRepo.create({
        id: randomUUID(),
        ...minimalFixture.org,
      });
      await orgRepo.save(org);
      console.log(`✅ Created org: ${org.name}`);
    } else {
      console.log(`⏭️  Org already exists: ${org.name}`);
    }

    // 3. Create admin user
    const existingUser = await userRepo.findOne({
      where: { email: minimalFixture.user.email },
    });

    if (!existingUser) {
      const passwordHash = await runner.hashPassword(
        minimalFixture.user.password,
      );
      const user = userRepo.create({
        id: randomUUID(),
        email: minimalFixture.user.email,
        passwordHash,
        orgId: org.id,
        emailVerified: minimalFixture.user.emailVerified,
        role: UserRole.ADMIN,
        name: minimalFixture.user.name,
        hasAcceptedMarketing: minimalFixture.user.hasAcceptedMarketing,
      });
      await userRepo.save(user);
      console.log(`✅ Created user: ${user.email}`);
    } else {
      console.log(`⏭️  User already exists: ${existingUser.email}`);
    }

    // 4. Create subscription
    const existingSubscription = await subscriptionRepo.findOne({
      where: { orgId: org.id, cancelledAt: IsNull() },
    });

    if (!existingSubscription) {
      // Create subscription with billing info (cascade will save both)
      const subscriptionId = randomUUID();

      // Create billing info with subscription ID
      const billingInfo = billingInfoRepo.create({
        id: randomUUID(),
        subscriptionId,
        companyName: minimalFixture.subscription.billingInfo.companyName,
        street: minimalFixture.subscription.billingInfo.street,
        houseNumber: minimalFixture.subscription.billingInfo.houseNumber,
        postalCode: minimalFixture.subscription.billingInfo.postalCode,
        city: minimalFixture.subscription.billingInfo.city,
        country: minimalFixture.subscription.billingInfo.country,
      });
      // Don't save billing info - let cascade handle it

      // Create subscription with billing info attached
      const subscription = subscriptionRepo.create({
        id: subscriptionId,
        orgId: org.id,
        noOfSeats: minimalFixture.subscription.noOfSeats,
        pricePerSeat: minimalFixture.subscription.pricePerSeat,
        renewalCycle: RenewalCycle.MONTHLY,
        renewalCycleAnchor: new Date(),
        billingInfo,
        cancelledAt: null,
      });
      await subscriptionRepo.save(subscription);
      console.log(`✅ Created subscription for org: ${org.name}`);
    } else {
      console.log(
        `⏭️  Active subscription already exists for org: ${org.name}`,
      );
    }

    // 5. Create permitted model
    const existingPermittedModel = await permittedModelRepo.findOne({
      where: { modelId: model.id, orgId: org.id },
    });

    if (!existingPermittedModel) {
      const permittedModel = permittedModelRepo.create({
        id: randomUUID(),
        modelId: model.id,
        orgId: org.id,
        isDefault: true, // Set as default for the organization
      });
      await permittedModelRepo.save(permittedModel);
      console.log(`✅ Created permitted model: ${model.name}`);
    } else {
      console.log(`⏭️  Permitted model already exists: ${model.name}`);
    }

    console.log('\n🎉 Minimal seed completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);

    process.exit(1);
  } finally {
    await runner.destroy();
  }
}

// Run if executed directly
if (require.main === module) {
  void seedMinimal();
}

export { seedMinimal };
