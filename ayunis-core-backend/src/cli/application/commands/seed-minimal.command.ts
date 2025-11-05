import { Command, CommandRunner } from 'nest-commander';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { User } from 'src/iam/users/domain/user.entity';
import { HashingHandler } from 'src/iam/hashing/application/ports/hashing.handler';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { PermitAllModelsForOrgUseCase } from 'src/domain/models/application/use-cases/permit-all-models-for-org/permit-all-models-for-org.use-case';
import { PermitAllModelsForOrgCommand } from 'src/domain/models/application/use-cases/permit-all-models-for-org/permit-all-models-for-org.command';

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

  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly orgsRepo: OrgsRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly hashingHandler: HashingHandler,
    private readonly permitAllModelsForOrgUseCase: PermitAllModelsForOrgUseCase,
  ) {
    super();
  }

  async run(): Promise<void> {
    ensureNonProduction();

    // Check if user already exists
    const existingUser = await this.usersRepo.findOneByEmail(this.adminEmail);

    let org: Org;
    let user: User;
    if (existingUser) {
      console.log(`User already exists: ${this.adminEmail}`);
      // Get the existing org
      org = await this.orgsRepo.findById(existingUser.orgId);
      user = existingUser;
      console.log(`Using existing org: ${org.name}`);
    } else {
      // Create org & admin user
      org = await this.orgsRepo.create(new Org({ name: this.orgName }));
      console.log(`Created org: ${this.orgName}`);

      const passwordHash = await this.hashingHandler.hash(this.adminPassword);
      user = await this.usersRepo.create(
        new User({
          email: this.adminEmail,
          passwordHash,
          orgId: org.id,
          emailVerified: true,
          role: UserRole.ADMIN,
          name: this.adminName,
          hasAcceptedMarketing: true,
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

    // Permit all available models for the organization
    console.log('Permitting all available models for organization...');
    await this.permitAllModelsForOrgUseCase.execute(
      new PermitAllModelsForOrgCommand(org.id, user.id),
    );
    console.log('Permitted all available models for organization');

    console.log('Seeding completed successfully');
  }
}
