import { Command, CommandRunner } from 'nest-commander';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { User } from 'src/iam/users/domain/user.entity';
import { HashingHandler } from 'src/iam/hashing/application/ports/hashing.handler';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedProvidersRepository } from 'src/domain/models/application/ports/permitted-providers.repository';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { ModelsRepository } from 'src/domain/models/application/ports/models.repository';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedProvider } from 'src/domain/models/domain/permitted-model-provider.entity';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';

function ensureNonProduction() {
  if ((process.env.NODE_ENV || 'development') === 'production') {
    throw new Error('Seeding is disabled in production');
  }
}

@Command({ name: 'seed:minimal', description: 'Seed minimal data' })
export class SeedMinimalCommand extends CommandRunner {
  private readonly orgName = 'Demo Org';
  private readonly adminEmail = 'admin@demo.local';
  private readonly adminPassword = 'admin';
  private readonly adminName = 'Admin';
  private readonly modelName = 'gpt-4o-mini';
  private readonly modelDisplayName = 'GPT-4o mini';
  private readonly modelProvider = ModelProvider.OPENAI;

  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly orgsRepo: OrgsRepository,
    private readonly modelsRepo: ModelsRepository,
    private readonly permittedProvidersRepo: PermittedProvidersRepository,
    private readonly permittedModelsRepo: PermittedModelsRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly hashingHandler: HashingHandler,
  ) {
    super();
  }

  async run(): Promise<void> {
    ensureNonProduction();

    // Check if model already exists
    let model = await this.modelsRepo.findOne({
      name: this.modelName,
      provider: this.modelProvider,
    });

    if (!model) {
      // Create available model
      model = new LanguageModel({
        name: this.modelName,
        displayName: this.modelDisplayName,
        provider: this.modelProvider,
        canStream: true,
        isReasoning: false,
        isArchived: false,
      });
      await this.modelsRepo.save(model);
      console.log(`Created model: ${this.modelName}`);
    } else {
      console.log(`Model already exists: ${this.modelName}`);
    }

    // Check if user already exists
    const existingUser = await this.usersRepo.findOneByEmail(this.adminEmail);

    let org: Org;
    if (existingUser) {
      console.log(`User already exists: ${this.adminEmail}`);
      // Get the existing org
      org = await this.orgsRepo.findById(existingUser.orgId);
      console.log(`Using existing org: ${org.name}`);
    } else {
      // Create org & admin user
      org = await this.orgsRepo.create(new Org({ name: this.orgName }));
      console.log(`Created org: ${this.orgName}`);

      const passwordHash = await this.hashingHandler.hash(this.adminPassword);
      await this.usersRepo.create(
        new User({
          email: this.adminEmail,
          passwordHash,
          orgId: org.id,
          emailVerified: true,
          role: UserRole.ADMIN,
          name: this.adminName,
        }),
      );
      console.log(`Created user: ${this.adminEmail}`);
    }

    // Check if subscription already exists for the org
    const existingSubscriptions = await this.subscriptionRepo.findByOrgId(
      org.id,
    );
    const activeSubscription = existingSubscriptions.find(
      (s) => !s.cancelledAt,
    );

    if (!activeSubscription) {
      // Create active subscription for the org
      const billingInfo = new SubscriptionBillingInfo({
        companyName: 'Demo Company',
        street: 'Main Street',
        houseNumber: '123',
        postalCode: '12345',
        city: 'Demo City',
        country: 'Germany',
      });
      await this.subscriptionRepo.create(
        new Subscription({
          orgId: org.id,
          noOfSeats: 5,
          pricePerSeat: 10,
          renewalCycle: RenewalCycle.MONTHLY,
          renewalCycleAnchor: new Date(),
          billingInfo,
          cancelledAt: null, // Active subscription
        }),
      );
      console.log(`Created subscription for org: ${org.name}`);
    } else {
      console.log(`Active subscription already exists for org: ${org.name}`);
    }

    // Create permitted provider & permitted model
    // These operations are idempotent by nature (they handle duplicates internally)
    try {
      await this.permittedProvidersRepo.create(
        org.id,
        new PermittedProvider({
          provider: this.modelProvider,
          orgId: org.id,
        }),
      );
      console.log(`Created permitted provider: ${this.modelProvider}`);
    } catch {
      console.log(
        `Permitted provider may already exist: ${this.modelProvider}`,
      );
    }

    try {
      await this.permittedModelsRepo.create(
        new PermittedModel({
          model,
          orgId: org.id,
        }),
      );
      console.log(`Created permitted model: ${this.modelName}`);
    } catch {
      console.log(`Permitted model may already exist: ${this.modelName}`);
    }

    console.log('Seeding completed successfully');
  }
}
