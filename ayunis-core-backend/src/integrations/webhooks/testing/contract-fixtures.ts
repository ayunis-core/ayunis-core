import { AcademyProgressUpdatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/academy-progress-updated.webhook-event';
import { MonthlyCreditsSnapshotWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/monthly-credits-snapshot.webhook-event';
import { MonthlyCreditsSnapshotEvent } from 'src/domain/usage/application/events/monthly-credits-snapshot.event';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { Usage } from 'src/domain/usage/domain/usage.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';
import type { AnyWebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import type { UsageBasedWebhookPayload } from 'src/integrations/webhooks/domain/subscription-webhook-payload.types';
import { OrgCreatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/org-created.webhook-event';
import { UserCreatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/user-created.webhook-event';
import { UserUpdatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/user-updated.webhook-event';
import { UserInvitedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/user-invited.webhook-event';
import { UserDeletedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/user-deleted.webhook-event';
import { SubscriptionCreatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-created.webhook-events';
import { SubscriptionCancelledWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-cancelled.webhook-event';
import { SubscriptionUncancelledWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-uncancelled.webhook-event';
import { SubscriptionExpiredWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-expired.webhook-event';
import { SubscriptionSeatsUpdatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-seats-updated.webhook-event';
import { SubscriptionMonthlyCreditsUpdatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-monthly-credits-updated.webhook-event';
import { SubscriptionBillingInfoUpdatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-billing-info-updated.webhook-event';
import { UsageCollectedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/usage-collected.webhook-event';
import { ChatSentWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/chat-sent.webhook-event';
import { SkillUsedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/skill-used.webhook-event';
import { SkillInstalledWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/skill-installed.webhook-event';
import { IntegrationUsedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/integration-used.webhook-event';
import { IntegrationInstalledWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/integration-installed.webhook-event';
import { OnboardingUpdatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/onboarding-updated.webhook-event';
import { AddonActivatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/addon-activated.webhook-event';
import { AddonDeactivatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/addon-deactivated.webhook-event';

const id = '00000000-0000-4000-8000-000000000004';
const date = new Date('2026-10-29T12:00:00.000Z');
const user = new User({
  id,
  orgId: id,
  email: 'admin@municipality.example',
  name: 'Municipal Admin',
  role: UserRole.ADMIN,
  emailVerified: true,
  passwordHash: '',
  hasAcceptedMarketing: false,
  createdAt: date,
  updatedAt: date,
});
const subscription: UsageBasedWebhookPayload = {
  id,
  orgId: id,
  type: 'USAGE_BASED',
  monthlyCredits: 1000,
  startsAt: date.toISOString(),
  endsAt: date.toISOString(),
  cancelledAt: null,
  createdAt: date.toISOString(),
  updatedAt: date.toISOString(),
};
const productUser = {
  userId: id,
  orgId: id,
  userEmail: user.email,
  userName: user.name,
};
const addon = {
  orgId: id,
  addonType: AddonType.AYUNIS_CORE_ACADEMY,
  actorUserId: null,
};

function createUserEvents(): AnyWebhookEvent[] {
  return [
    new OrgCreatedWebhookEvent(
      new Org({
        id,
        name: 'Municipality',
        users: [user],
        createdAt: date,
        updatedAt: date,
      }),
    ),
    new UserCreatedWebhookEvent({ user, orgId: id, orgName: 'Municipality' }),
    new UserUpdatedWebhookEvent(user),
    new UserInvitedWebhookEvent(
      new Invite({
        id,
        orgId: id,
        email: user.email,
        role: UserRole.USER,
        expiresAt: date,
        createdAt: date,
      }),
    ),
    new UserDeletedWebhookEvent({ id, orgId: id, email: user.email }),
  ];
}

function createUsageEvents(): AnyWebhookEvent[] {
  return [
    new MonthlyCreditsSnapshotWebhookEvent(
      new MonthlyCreditsSnapshotEvent({
        organizationId: id,
        periodStart: date,
        periodEnd: date,
        creditsConsumed: 10000,
      }),
    ),
    new UsageCollectedWebhookEvent(
      new Usage({
        id,
        userId: id,
        organizationId: id,
        modelId: id,
        provider: ModelProvider.OPENAI,
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        requestId: id,
        createdAt: date,
      }),
      'Municipal Model',
      user,
    ),
    new ChatSentWebhookEvent(
      { userId: id, orgId: id, threadId: id, messageId: id },
      user,
    ),
  ];
}

function createProductEvents(): AnyWebhookEvent[] {
  return [
    new SkillUsedWebhookEvent({
      ...productUser,
      skillId: id,
      skillName: 'Minutes',
    }),
    new SkillInstalledWebhookEvent({
      ...productUser,
      identifier: 'municipal-minutes',
    }),
    new IntegrationUsedWebhookEvent({
      ...productUser,
      integrationId: id,
      integrationName: 'Documents',
    }),
    new IntegrationInstalledWebhookEvent({
      ...productUser,
      identifier: 'municipal-documents',
    }),
    new AcademyProgressUpdatedWebhookEvent({
      ...productUser,
      started: true,
      participationConfirmedAt: date.toISOString(),
    }),
    new OnboardingUpdatedWebhookEvent({
      ...productUser,
      userRole: UserRole.ADMIN,
      previousCompletedStepIds: [],
      completedStepIds: ['welcome'],
      previousHidden: false,
      hidden: false,
    }),
  ];
}

function createSubscriptionEvents(): AnyWebhookEvent[] {
  return [
    new SubscriptionCreatedWebhookEvent(subscription),
    new SubscriptionCancelledWebhookEvent({
      ...subscription,
      cancelledAt: date.toISOString(),
    }),
    new SubscriptionUncancelledWebhookEvent(subscription),
    new SubscriptionExpiredWebhookEvent(subscription),
    new SubscriptionSeatsUpdatedWebhookEvent({
      id,
      orgId: id,
      startsAt: date.toISOString(),
      endsAt: null,
      cancelledAt: null,
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
      type: 'SEAT_BASED',
      noOfSeats: 5,
      pricePerSeat: 25,
      renewalCycle: 'monthly',
      renewalCycleAnchor: date.toISOString(),
    }),
    new SubscriptionMonthlyCreditsUpdatedWebhookEvent(subscription),
    new SubscriptionBillingInfoUpdatedWebhookEvent({
      companyName: 'Municipality',
      street: 'Town Hall',
      houseNumber: '1',
      postalCode: '10115',
      city: 'Berlin',
      country: 'DE',
      orgId: id,
      subscriptionId: id,
    }),
  ];
}

export function createContractEvents(): AnyWebhookEvent[] {
  return [
    ...createUserEvents(),
    ...createSubscriptionEvents(),
    ...createUsageEvents(),
    ...createProductEvents(),
    new AddonActivatedWebhookEvent(addon),
    new AddonDeactivatedWebhookEvent(addon),
  ];
}

export function createContractFixtures(): unknown[] {
  return createContractEvents().map(
    (event) =>
      JSON.parse(
        JSON.stringify({
          eventId: id,
          eventType: event.eventType,
          timestamp: date.toISOString(),
          data: event.data,
        }),
      ) as unknown,
  );
}
