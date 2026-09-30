import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { UpdateSeatsUseCase } from './update-seats.use-case';
import { UpdateSeatsCommand } from './update-seats.command';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import { GetActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.use-case';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';

const mockOrgId = randomUUID();
const mockUserId = randomUUID();

function createSeatBased(noOfSeats: number, startsAt: Date) {
  return new SeatBasedSubscription({
    orgId: mockOrgId,
    noOfSeats,
    pricePerSeat: 99.99,
    renewalCycle: RenewalCycle.YEARLY,
    renewalCycleAnchor: startsAt,
    startsAt,
    cancelledAt: null,
    billingInfo: new SubscriptionBillingInfo({
      companyName: 'Gemeinde Musterstadt',
      street: 'Hauptstraße',
      houseNumber: '1',
      postalCode: '12345',
      city: 'Musterstadt',
      country: 'DE',
    }),
  });
}

describe('UpdateSeatsUseCase', () => {
  let useCase: UpdateSeatsUseCase;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let getActiveSubscriptionUseCase: jest.Mocked<GetActiveSubscriptionUseCase>;
  let contextService: jest.Mocked<ContextService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateSeatsUseCase,
        {
          provide: SubscriptionRepository,
          useValue: { update: jest.fn(), findByOrgId: jest.fn() },
        },
        {
          provide: GetActiveSubscriptionUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: FindUsersByOrgIdUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue({ data: [], total: 0 }),
          },
        },
        {
          provide: GetInvitesByOrgUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue({ data: [], total: 0 }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: { emitAsync: jest.fn().mockResolvedValue([]) },
        },
        { provide: ContextService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    useCase = module.get(UpdateSeatsUseCase);
    subscriptionRepository = module.get(SubscriptionRepository);
    getActiveSubscriptionUseCase = module.get(GetActiveSubscriptionUseCase);
    contextService = module.get(ContextService);

    contextService.get.mockImplementation((key) => {
      if (key === 'systemRole') return SystemRole.SUPER_ADMIN;
      if (key === 'role') return UserRole.ADMIN;
      if (key === 'orgId') return mockOrgId;
      return undefined;
    });
    subscriptionRepository.update.mockImplementation((subscription) =>
      Promise.resolve(subscription),
    );
  });

  // Seat updates are also driven by the org-admin invite auto-bump, which
  // derives the new count from the serving subscription. Resolving them to the
  // newest record instead would raise a future contract's seats while leaving
  // the serving licence full, letting invites past the licensed count.
  it('updates the serving subscription, not a newer scheduled one', async () => {
    const serving = createSeatBased(10, new Date('2026-01-01T00:00:00.000Z'));
    const scheduled = createSeatBased(50, new Date('2099-01-01T00:00:00.000Z'));
    getActiveSubscriptionUseCase.execute.mockResolvedValue({
      subscription: serving,
      availableSeats: 0,
      nextRenewalDate: new Date(),
    });
    subscriptionRepository.findByOrgId.mockResolvedValue([serving, scheduled]);

    await useCase.execute(
      new UpdateSeatsCommand({
        orgId: mockOrgId,
        requestingUserId: mockUserId,
        noOfSeats: 11,
      }),
    );

    expect(subscriptionRepository.update).toHaveBeenCalledTimes(1);
    expect(subscriptionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: serving.id, noOfSeats: 11 }),
    );
    expect(scheduled.noOfSeats).toBe(50);
  });
});
