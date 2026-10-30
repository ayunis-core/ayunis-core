import { z } from "zod";
import { WEBHOOK_EVENT_TYPE, type WebhookEventType } from "./event-types.js";
import {
  PAYLOAD_SCHEMAS,
  type OrgPayload,
  type UserPayload,
  type UserInvitedPayload,
  type UserDeletedPayload,
  type SubscriptionPayload,
  type BillingInfoPayload,
  type UsageCollectedPayload,
  type ChatSentPayload,
  type SkillUsedPayload,
  type SkillInstalledPayload,
  type IntegrationUsedPayload,
  type IntegrationInstalledPayload,
  type OnboardingUpdatedPayload,
} from "./payload-schemas.js";

const baseEnvelopeFields = {
  eventId: z.uuid(),
  timestamp: z.iso.datetime(),
};

function envelopeFor<TType extends WebhookEventType, TData extends z.ZodType>(
  eventType: TType,
  data: TData,
) {
  return z
    .object({
      ...baseEnvelopeFields,
      eventType: z.literal(eventType),
      data,
    })
    .strict();
}

export const webhookEnvelopeSchema = z.discriminatedUnion("eventType", [
  envelopeFor(
    WEBHOOK_EVENT_TYPE.USAGE_MONTHLY_CREDITS_SNAPSHOT,
    PAYLOAD_SCHEMAS.monthlyCreditsSnapshot,
  ),
  envelopeFor(
    WEBHOOK_EVENT_TYPE.SUBSCRIPTION_MONTHLY_CREDITS_UPDATED,
    PAYLOAD_SCHEMAS.usageBasedSubscription,
  ),
  envelopeFor(
    WEBHOOK_EVENT_TYPE.SUBSCRIPTION_EXPIRED,
    PAYLOAD_SCHEMAS.subscription,
  ),
  envelopeFor(
    WEBHOOK_EVENT_TYPE.ACADEMY_PROGRESS_UPDATED,
    PAYLOAD_SCHEMAS.academyProgressUpdated,
  ),
  envelopeFor(WEBHOOK_EVENT_TYPE.ADDON_ACTIVATED, PAYLOAD_SCHEMAS.addon),
  envelopeFor(WEBHOOK_EVENT_TYPE.ADDON_DEACTIVATED, PAYLOAD_SCHEMAS.addon),
  envelopeFor(WEBHOOK_EVENT_TYPE.ORG_CREATED, PAYLOAD_SCHEMAS.org),
  envelopeFor(WEBHOOK_EVENT_TYPE.USER_CREATED, PAYLOAD_SCHEMAS.userCreated),
  envelopeFor(WEBHOOK_EVENT_TYPE.USER_INVITED, PAYLOAD_SCHEMAS.userInvited),
  envelopeFor(WEBHOOK_EVENT_TYPE.USER_UPDATED, PAYLOAD_SCHEMAS.userUpdated),
  envelopeFor(WEBHOOK_EVENT_TYPE.USER_DELETED, PAYLOAD_SCHEMAS.userDeleted),
  envelopeFor(
    WEBHOOK_EVENT_TYPE.SUBSCRIPTION_CREATED,
    PAYLOAD_SCHEMAS.subscription,
  ),
  envelopeFor(
    WEBHOOK_EVENT_TYPE.SUBSCRIPTION_CANCELLED,
    PAYLOAD_SCHEMAS.subscription,
  ),
  envelopeFor(
    WEBHOOK_EVENT_TYPE.SUBSCRIPTION_UNCANCELLED,
    PAYLOAD_SCHEMAS.subscription,
  ),
  envelopeFor(
    WEBHOOK_EVENT_TYPE.SUBSCRIPTION_SEATS_UPDATED,
    PAYLOAD_SCHEMAS.subscription,
  ),
  envelopeFor(
    WEBHOOK_EVENT_TYPE.SUBSCRIPTION_BILLING_INFO_UPDATED,
    PAYLOAD_SCHEMAS.billingInfo,
  ),
  envelopeFor(
    WEBHOOK_EVENT_TYPE.USAGE_COLLECTED,
    PAYLOAD_SCHEMAS.usageCollected,
  ),
  envelopeFor(WEBHOOK_EVENT_TYPE.CHAT_SENT, PAYLOAD_SCHEMAS.chatSent),
  envelopeFor(WEBHOOK_EVENT_TYPE.SKILL_USED, PAYLOAD_SCHEMAS.skillUsed),
  envelopeFor(
    WEBHOOK_EVENT_TYPE.SKILL_INSTALLED,
    PAYLOAD_SCHEMAS.skillInstalled,
  ),
  envelopeFor(
    WEBHOOK_EVENT_TYPE.INTEGRATION_USED,
    PAYLOAD_SCHEMAS.integrationUsed,
  ),
  envelopeFor(
    WEBHOOK_EVENT_TYPE.INTEGRATION_INSTALLED,
    PAYLOAD_SCHEMAS.integrationInstalled,
  ),
  envelopeFor(
    WEBHOOK_EVENT_TYPE.ONBOARDING_UPDATED,
    PAYLOAD_SCHEMAS.onboardingUpdated,
  ),
]);

export type SubscriptionExpiredEvent = Extract<
  z.infer<typeof webhookEnvelopeSchema>,
  { eventType: "subscription.expired" }
>;

export type WebhookEnvelope = z.infer<typeof webhookEnvelopeSchema>;

export type OrgCreatedEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.ORG_CREATED }
>;
export type UserCreatedEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.USER_CREATED }
>;
export type UserInvitedEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.USER_INVITED }
>;
export type UserUpdatedEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.USER_UPDATED }
>;
export type UserDeletedEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.USER_DELETED }
>;
export type SubscriptionMonthlyCreditsUpdatedEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.SUBSCRIPTION_MONTHLY_CREDITS_UPDATED }
>;
export type SubscriptionCreatedEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.SUBSCRIPTION_CREATED }
>;
export type SubscriptionCancelledEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.SUBSCRIPTION_CANCELLED }
>;
export type SubscriptionUncancelledEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.SUBSCRIPTION_UNCANCELLED }
>;
export type SubscriptionSeatsUpdatedEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.SUBSCRIPTION_SEATS_UPDATED }
>;
export type SubscriptionBillingInfoUpdatedEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.SUBSCRIPTION_BILLING_INFO_UPDATED }
>;
export type UsageCollectedEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.USAGE_COLLECTED }
>;
export type ChatSentEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.CHAT_SENT }
>;
export type SkillUsedEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.SKILL_USED }
>;
export type SkillInstalledEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.SKILL_INSTALLED }
>;
export type IntegrationUsedEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.INTEGRATION_USED }
>;
export type IntegrationInstalledEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.INTEGRATION_INSTALLED }
>;
export type OnboardingUpdatedEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.ONBOARDING_UPDATED }
>;

export type {
  OrgPayload,
  UserPayload,
  UserInvitedPayload,
  UserDeletedPayload,
  SubscriptionPayload,
  BillingInfoPayload,
  UsageCollectedPayload,
  ChatSentPayload,
  SkillUsedPayload,
  SkillInstalledPayload,
  IntegrationUsedPayload,
  IntegrationInstalledPayload,
  OnboardingUpdatedPayload,
};

export type ParseResult =
  { ok: true; event: WebhookEnvelope } | { ok: false; error: z.ZodError };

export function parseWebhookEvent(rawBody: unknown): ParseResult {
  const parsed = webhookEnvelopeSchema.safeParse(rawBody);
  if (parsed.success) {
    return { ok: true, event: parsed.data };
  }
  return { ok: false, error: parsed.error };
}

export type MonthlyCreditsSnapshotEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.USAGE_MONTHLY_CREDITS_SNAPSHOT }
>;

export type EventPayload<T extends WebhookEventType> = Extract<
  WebhookEnvelope,
  { eventType: T }
>["data"];

export type AcademyProgressUpdatedEvent = Extract<
  WebhookEnvelope,
  { eventType: typeof WEBHOOK_EVENT_TYPE.ACADEMY_PROGRESS_UPDATED }
>;

export type AddonEvent = Extract<
  WebhookEnvelope,
  {
    eventType:
      | typeof WEBHOOK_EVENT_TYPE.ADDON_ACTIVATED
      | typeof WEBHOOK_EVENT_TYPE.ADDON_DEACTIVATED;
  }
>;
