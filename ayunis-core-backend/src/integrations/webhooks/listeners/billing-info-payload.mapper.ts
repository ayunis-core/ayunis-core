import type { BillingInfoEventData } from 'src/iam/subscriptions/application/events/subscription-event-data.types';
import type { BillingInfoPayload } from '../domain/subscription-webhook-payload.types';

/**
 * Maps domain-level {@link BillingInfoEventData} to the webhook-specific
 * {@link BillingInfoPayload}.
 */
export function mapBillingInfoToWebhookPayload(
  data: BillingInfoEventData,
): BillingInfoPayload {
  return {
    companyName: data.companyName,
    street: data.street,
    houseNumber: data.houseNumber,
    postalCode: data.postalCode,
    city: data.city,
    country: data.country,
    vatNumber: data.vatNumber,
    subText: data.subText,
    orgId: data.orgId,
    subscriptionId: data.subscriptionId,
  };
}
