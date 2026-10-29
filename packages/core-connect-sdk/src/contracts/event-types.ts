export const WEBHOOK_EVENT_TYPE = {
  ORG_CREATED: "org.created",
  USER_CREATED: "user.created",
  USER_INVITED: "user.invited",
  USER_UPDATED: "user.updated",
  USER_DELETED: "user.deleted",
  SUBSCRIPTION_MONTHLY_CREDITS_UPDATED: "subscription.monthly_credits_updated",
  SUBSCRIPTION_CREATED: "subscription.created",
  SUBSCRIPTION_CANCELLED: "subscription.cancelled",
  SUBSCRIPTION_UNCANCELLED: "subscription.uncancelled",
  SUBSCRIPTION_EXPIRED: "subscription.expired",
  SUBSCRIPTION_SEATS_UPDATED: "subscription.seats_updated",
  SUBSCRIPTION_BILLING_INFO_UPDATED: "subscription.billing_info_updated",
  USAGE_COLLECTED: "usage.collected",
  USAGE_MONTHLY_CREDITS_SNAPSHOT: "usage.monthly_credits_snapshot",
  CHAT_SENT: "chat.sent",
  SKILL_USED: "skill.used",
  SKILL_INSTALLED: "skill.installed",
  INTEGRATION_USED: "integration.used",
  INTEGRATION_INSTALLED: "integration.installed",
  ONBOARDING_UPDATED: "onboarding.updated",
  ACADEMY_PROGRESS_UPDATED: "academy.progress_updated",
  ADDON_ACTIVATED: "addon.activated",
  ADDON_DEACTIVATED: "addon.deactivated",
} as const;

export type WebhookEventType =
  (typeof WEBHOOK_EVENT_TYPE)[keyof typeof WEBHOOK_EVENT_TYPE];

export const ALL_WEBHOOK_EVENT_TYPES: ReadonlySet<WebhookEventType> = new Set(
  Object.values(WEBHOOK_EVENT_TYPE),
);
