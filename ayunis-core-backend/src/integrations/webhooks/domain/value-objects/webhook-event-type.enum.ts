export enum WebhookEventType {
  ORG_CREATED = 'org.created',
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  SUBSCRIPTION_UNCANCELLED = 'subscription.uncancelled',
  SUBSCRIPTION_SEATS_UPDATED = 'subscription.seats_updated',
  SUBSCRIPTION_BILLING_INFO_UPDATED = 'subscription.billing_info_updated',
}
