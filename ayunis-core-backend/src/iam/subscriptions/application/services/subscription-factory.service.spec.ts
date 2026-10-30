import type { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { SubscriptionFactory } from './subscription-factory.service';
import type { CountPendingInvitesByOrgIdUseCase } from 'src/iam/invites/application/use-cases/count-pending-invites-by-org-id/count-pending-invites-by-org-id.use-case';
import type { CountUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/count-users-by-org-id/count-users-by-org-id.use-case';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { TooManyUsedSeatsError } from 'src/iam/subscriptions/application/subscription.errors';

describe('SubscriptionFactory without a user principal', () => {
  const orgId = randomUUID();
  const input = {
    orgId,
    type: SubscriptionType.SEAT_BASED,
    noOfSeats: 25,
    companyName: 'Example Municipality',
    street: 'Town Hall Street',
    houseNumber: '1',
    postalCode: '10115',
    city: 'Berlin',
    country: 'DE',
  };
  const invites = { execute: jest.fn() };
  const users = { execute: jest.fn() };
  const config = { get: jest.fn().mockReturnValue(18) };
  let factory: SubscriptionFactory;

  beforeEach(() => {
    invites.execute.mockResolvedValue(3);
    users.execute.mockResolvedValue(20);
    factory = new SubscriptionFactory(
      config as unknown as ConfigService,
      invites as unknown as CountPendingInvitesByOrgIdUseCase,
      users as unknown as CountUsersByOrgIdUseCase,
    );
  });

  it('builds a subscription for a trusted system caller without fabricating a user', async () => {
    await expect(factory.build(input)).resolves.toMatchObject({
      orgId,
      noOfSeats: 25,
    });
  });

  it('still rejects fewer purchased seats than users and reserved invitations', async () => {
    invites.execute.mockResolvedValue(6);
    await expect(factory.build(input)).rejects.toBeInstanceOf(
      TooManyUsedSeatsError,
    );
  });
});
