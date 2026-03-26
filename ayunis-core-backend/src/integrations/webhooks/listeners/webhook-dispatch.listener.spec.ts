import type { UUID } from 'crypto';
import { WebhookDispatchListener } from './webhook-dispatch.listener';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import { UserUpdatedEvent } from 'src/iam/users/application/events/user-updated.event';
import { UserDeletedEvent } from 'src/iam/users/application/events/user-deleted.event';
import { OrgCreatedEvent } from 'src/iam/orgs/application/events/org-created.event';
import { SubscriptionCreatedEvent } from 'src/iam/subscriptions/application/events/subscription-created.event';
import { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import { SubscriptionUncancelledEvent } from 'src/iam/subscriptions/application/events/subscription-uncancelled.event';
import { SubscriptionSeatsUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-seats-updated.event';
import { SubscriptionBillingInfoUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-billing-info-updated.event';
import { WebhookEventType } from '../domain/value-objects/webhook-event-type.enum';
import { User } from 'src/iam/users/domain/user.entity';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { SendWebhookUseCase } from '../application/use-cases/send-webhook/send-webhook.use-case';
import type { SeatBasedSubscriptionEventData } from 'src/iam/subscriptions/application/events/subscription-event-data.types';

const USER_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const ORG_ID = '00000000-0000-0000-0000-000000000002' as UUID;
const SUB_ID = '00000000-0000-0000-0000-000000000003' as UUID;

function makeUser(): User {
  return new User({
    id: USER_ID,
    email: 'test@example.com',
    emailVerified: true,
    passwordHash: 'hashed',
    role: UserRole.ADMIN,
    orgId: ORG_ID,
    name: 'Test User',
    hasAcceptedMarketing: false,
  });
}

function makeOrg(): Org {
  return new Org({
    id: ORG_ID,
    name: 'Test Org',
  });
}

function makeSeatBasedPayload(): SeatBasedSubscriptionEventData {
  return {
    id: SUB_ID,
    orgId: ORG_ID,
    type: SubscriptionType.SEAT_BASED,
    cancelledAt: null,
    startsAt: new Date('2025-01-01T00:00:00Z'),
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-02T00:00:00Z'),
    noOfSeats: 10,
    pricePerSeat: 25,
    renewalCycle: RenewalCycle.MONTHLY,
    renewalCycleAnchor: new Date('2025-01-01T00:00:00Z'),
  };
}

describe('WebhookDispatchListener', () => {
  let listener: WebhookDispatchListener;
  let sendWebhookUseCase: jest.Mocked<SendWebhookUseCase>;

  beforeEach(() => {
    sendWebhookUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SendWebhookUseCase>;

    listener = new WebhookDispatchListener(sendWebhookUseCase);
  });

  describe('handleUserCreated', () => {
    it('should dispatch UserCreatedWebhookEvent when user is present', async () => {
      const user = makeUser();
      await listener.handleUserCreated(
        new UserCreatedEvent(USER_ID, ORG_ID, user, 'engineering'),
      );

      expect(sendWebhookUseCase.execute).toHaveBeenCalledTimes(1);
      const command = sendWebhookUseCase.execute.mock.calls[0][0];
      expect(command.event.eventType).toBe(WebhookEventType.USER_CREATED);
    });

    it('should not dispatch when user is absent', async () => {
      await listener.handleUserCreated(new UserCreatedEvent(USER_ID, ORG_ID));

      expect(sendWebhookUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('handleUserUpdated', () => {
    it('should dispatch UserUpdatedWebhookEvent', async () => {
      const user = makeUser();
      await listener.handleUserUpdated(
        new UserUpdatedEvent(USER_ID, ORG_ID, user),
      );

      expect(sendWebhookUseCase.execute).toHaveBeenCalledTimes(1);
      const command = sendWebhookUseCase.execute.mock.calls[0][0];
      expect(command.event.eventType).toBe(WebhookEventType.USER_UPDATED);
    });
  });

  describe('handleUserDeleted', () => {
    it('should dispatch UserDeletedWebhookEvent', async () => {
      await listener.handleUserDeleted(new UserDeletedEvent(USER_ID, ORG_ID));

      expect(sendWebhookUseCase.execute).toHaveBeenCalledTimes(1);
      const command = sendWebhookUseCase.execute.mock.calls[0][0];
      expect(command.event.eventType).toBe(WebhookEventType.USER_DELETED);
    });
  });

  describe('handleOrgCreated', () => {
    it('should dispatch OrgCreatedWebhookEvent', async () => {
      await listener.handleOrgCreated(
        new OrgCreatedEvent(ORG_ID, makeOrg(), makeUser()),
      );

      expect(sendWebhookUseCase.execute).toHaveBeenCalledTimes(1);
      const command = sendWebhookUseCase.execute.mock.calls[0][0];
      expect(command.event.eventType).toBe(WebhookEventType.ORG_CREATED);
    });
  });

  describe('handleSubscriptionCreated', () => {
    it('should dispatch SubscriptionCreatedWebhookEvent with mapped payload', async () => {
      await listener.handleSubscriptionCreated(
        new SubscriptionCreatedEvent(ORG_ID, makeSeatBasedPayload()),
      );

      expect(sendWebhookUseCase.execute).toHaveBeenCalledTimes(1);
      const command = sendWebhookUseCase.execute.mock.calls[0][0];
      expect(command.event.eventType).toBe(
        WebhookEventType.SUBSCRIPTION_CREATED,
      );
      expect(command.event.data).toEqual(
        expect.objectContaining({
          type: 'SEAT_BASED',
          createdAt: '2025-01-01T00:00:00.000Z',
        }),
      );
    });
  });

  describe('handleSubscriptionCancelled', () => {
    it('should dispatch SubscriptionCancelledWebhookEvent', async () => {
      await listener.handleSubscriptionCancelled(
        new SubscriptionCancelledEvent(ORG_ID, makeSeatBasedPayload()),
      );

      expect(sendWebhookUseCase.execute).toHaveBeenCalledTimes(1);
      const command = sendWebhookUseCase.execute.mock.calls[0][0];
      expect(command.event.eventType).toBe(
        WebhookEventType.SUBSCRIPTION_CANCELLED,
      );
    });
  });

  describe('handleSubscriptionUncancelled', () => {
    it('should dispatch SubscriptionUncancelledWebhookEvent', async () => {
      await listener.handleSubscriptionUncancelled(
        new SubscriptionUncancelledEvent(ORG_ID, makeSeatBasedPayload()),
      );

      expect(sendWebhookUseCase.execute).toHaveBeenCalledTimes(1);
      const command = sendWebhookUseCase.execute.mock.calls[0][0];
      expect(command.event.eventType).toBe(
        WebhookEventType.SUBSCRIPTION_UNCANCELLED,
      );
    });
  });

  describe('handleSubscriptionSeatsUpdated', () => {
    it('should dispatch SubscriptionSeatsUpdatedWebhookEvent', async () => {
      await listener.handleSubscriptionSeatsUpdated(
        new SubscriptionSeatsUpdatedEvent(ORG_ID, makeSeatBasedPayload()),
      );

      expect(sendWebhookUseCase.execute).toHaveBeenCalledTimes(1);
      const command = sendWebhookUseCase.execute.mock.calls[0][0];
      expect(command.event.eventType).toBe(
        WebhookEventType.SUBSCRIPTION_SEATS_UPDATED,
      );
    });
  });

  describe('handleSubscriptionBillingInfoUpdated', () => {
    it('should dispatch SubscriptionBillingInfoUpdatedWebhookEvent with mapped payload', async () => {
      await listener.handleSubscriptionBillingInfoUpdated(
        new SubscriptionBillingInfoUpdatedEvent(ORG_ID, {
          companyName: 'Acme',
          street: 'Main St',
          houseNumber: '1',
          postalCode: '12345',
          city: 'Berlin',
          country: 'DE',
          vatNumber: 'DE123456789',
          subText: 'Dept. Finance',
          orgId: ORG_ID,
          subscriptionId: SUB_ID,
        }),
      );

      expect(sendWebhookUseCase.execute).toHaveBeenCalledTimes(1);
      const command = sendWebhookUseCase.execute.mock.calls[0][0];
      expect(command.event.eventType).toBe(
        WebhookEventType.SUBSCRIPTION_BILLING_INFO_UPDATED,
      );
      expect(command.event.data).toEqual({
        companyName: 'Acme',
        street: 'Main St',
        houseNumber: '1',
        postalCode: '12345',
        city: 'Berlin',
        country: 'DE',
        vatNumber: 'DE123456789',
        subText: 'Dept. Finance',
        orgId: ORG_ID,
        subscriptionId: SUB_ID,
      });
    });
  });

  describe('error handling', () => {
    it('should not throw when SendWebhookUseCase fails', async () => {
      sendWebhookUseCase.execute.mockRejectedValue(
        new Error('Network failure'),
      );

      await expect(
        listener.handleUserDeleted(new UserDeletedEvent(USER_ID, ORG_ID)),
      ).resolves.toBeUndefined();
    });
  });
});
