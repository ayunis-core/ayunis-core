import type {
  FynnCustomer,
  FynnEntitlement,
  FynnSubscription,
  FynnSubscriptionSummary,
} from 'src/integrations/fynn/application/models/fynn-snapshot';

export type FynnCustomerLink = Pick<FynnCustomer, 'id' | 'customFields'>;

export abstract class FynnClient {
  abstract getSubscription(id: string): Promise<FynnSubscription>;
  abstract getCustomer(id: string): Promise<FynnCustomer>;
  abstract listCustomerLinks(): Promise<FynnCustomerLink[]>;
  abstract listSubscriptions(
    customerId: string,
  ): Promise<FynnSubscriptionSummary[]>;
  abstract getEntitlements(subscriptionId: string): Promise<FynnEntitlement[]>;
}
