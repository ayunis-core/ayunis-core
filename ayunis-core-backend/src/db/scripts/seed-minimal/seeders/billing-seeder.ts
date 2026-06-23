import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { IsNull } from 'typeorm';
import {
  SeatBasedSubscriptionRecord,
  UsageBasedSubscriptionRecord,
  type SubscriptionRecord,
} from 'src/iam/subscriptions/infrastructure/persistence/local/schema/subscription.record';
import { SubscriptionBillingInfoRecord } from 'src/iam/subscriptions/infrastructure/persistence/local/schema/subscription-billing-info.record';
import { OrgSeeder } from './base-seeder';
import { log } from 'src/db/scripts/utils/seed-log';
import type { SeedState } from '../seed-state';
import type { SubscriptionFixture, OrgFixture } from '../seed-types';

type SeatSubscription = Extract<SubscriptionFixture, { type: 'seat' }>;
type UsageSubscription = Extract<SubscriptionFixture, { type: 'usage' }>;
type BillingInfoFixture = SubscriptionFixture['billingInfo'];

export class BillingSeeder extends OrgSeeder {
  async seedForOrg(ctx: SeedState, org: OrgFixture): Promise<void> {
    const orgId = ctx.getOrg(org.key).id;
    if (org.subscription.type === 'seat') {
      await this.seedSeatBasedSubscription(orgId, org.subscription);
    } else {
      await this.seedUsageBasedSubscription(orgId, org.subscription);
    }
  }

  private async seedSeatBasedSubscription(
    orgId: UUID,
    fixture: SeatSubscription,
  ): Promise<void> {
    const subscriptions = this.repo(SeatBasedSubscriptionRecord);
    const existing = await subscriptions.findOne({
      where: { orgId, cancelledAt: IsNull() },
    });
    if (existing) {
      log('Subscription', `org=${orgId}`, false);
      return;
    }

    const now = new Date();
    const created = await subscriptions.save(
      subscriptions.create({
        id: randomUUID(),
        orgId,
        noOfSeats: fixture.noOfSeats,
        pricePerSeat: fixture.pricePerSeat,
        renewalCycle: fixture.renewalCycle,
        startsAt: now,
        renewalCycleAnchor: now,
        cancelledAt: null,
      }),
    );

    await this.attachBillingInfo(created, fixture.billingInfo);
    log('Subscription', `org=${orgId}`, true);
  }

  private async seedUsageBasedSubscription(
    orgId: UUID,
    fixture: UsageSubscription,
  ): Promise<void> {
    const subscriptions = this.repo(UsageBasedSubscriptionRecord);
    const existing = await subscriptions.findOne({
      where: { orgId, cancelledAt: IsNull() },
    });
    if (existing) {
      log('Usage subscription', `org=${orgId}`, false);
      return;
    }

    const created = await subscriptions.save(
      subscriptions.create({
        id: randomUUID(),
        orgId,
        monthlyCredits: fixture.monthlyCredits,
        startsAt: new Date(),
        cancelledAt: null,
      }),
    );

    await this.attachBillingInfo(created, fixture.billingInfo);
    log('Usage subscription', `org=${orgId}`, true);
  }

  private async attachBillingInfo(
    subscription: SubscriptionRecord,
    billingInfoFixture: BillingInfoFixture,
  ): Promise<void> {
    const billingInfos = this.repo(SubscriptionBillingInfoRecord);
    subscription.billingInfo = await billingInfos.save(
      billingInfos.create({
        id: randomUUID(),
        subscription,
        ...billingInfoFixture,
      }),
    );
  }
}
