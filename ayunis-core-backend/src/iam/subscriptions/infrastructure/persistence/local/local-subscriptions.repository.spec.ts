import type { DataSource, EntityManager } from 'typeorm';
import { LocalSubscriptionsRepository } from './local-subscriptions.repository';
import { SubscriptionMapper } from './mappers/subscription.mapper';
import { SubscriptionBillingInfoMapper } from './mappers/subscription-billing-info.mapper';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { randomUUID } from 'crypto';

// AYC-627: subscription writes have to end up in the caller's transaction when
// there is one, and still open their own when there is not. txHost.tx never
// returns undefined — outside a transaction it is the adapter's fallback
// manager — so only isTransactionActive() can tell the two cases apart.
describe('LocalSubscriptionsRepository ambient transaction', () => {
  const orgId = randomUUID();

  function aSubscription(): SeatBasedSubscription {
    return new SeatBasedSubscription({
      orgId,
      noOfSeats: 5,
      pricePerSeat: 10,
      renewalCycle: RenewalCycle.MONTHLY,
      renewalCycleAnchor: new Date('2026-01-01T00:00:00Z'),
      billingInfo: new SubscriptionBillingInfo({
        companyName: 'Stadt',
        street: 'Street',
        houseNumber: '1',
        postalCode: '12345',
        city: 'City',
        country: 'DE',
      }),
    });
  }

  function build(isActive: boolean) {
    const manager = {
      save: jest.fn().mockImplementation((r: unknown) => Promise.resolve(r)),
      insert: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      getRepository: jest.fn().mockReturnValue({}),
    } as unknown as EntityManager;

    const dataSourceTransaction = jest
      .fn()
      .mockImplementation((work: (m: EntityManager) => Promise<unknown>) =>
        work(manager),
      );

    const repository = new LocalSubscriptionsRepository(
      new SubscriptionMapper(new SubscriptionBillingInfoMapper()),
      new SubscriptionBillingInfoMapper(),
      { transaction: dataSourceTransaction } as unknown as DataSource,
      {
        tx: manager,
        isTransactionActive: () => isActive,
      } as never,
    );

    return { repository, dataSourceTransaction, manager };
  }

  it('opens its own transaction when no transaction is active', async () => {
    const { repository, dataSourceTransaction } = build(false);

    await repository.create(aSubscription());

    expect(dataSourceTransaction).toHaveBeenCalledTimes(1);
  });

  it('joins the caller transaction instead of opening a nested one', async () => {
    const { repository, dataSourceTransaction, manager } = build(true);

    await repository.create(aSubscription());

    expect(dataSourceTransaction).not.toHaveBeenCalled();
    // the write still happened, just on the caller's manager
    expect(manager.save).toHaveBeenCalled();
  });
});
