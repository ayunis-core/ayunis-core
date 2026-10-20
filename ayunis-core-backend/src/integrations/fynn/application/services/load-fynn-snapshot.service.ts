import { fynnCustomersForOrg } from './fynn-read-context';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { FynnClient } from 'src/integrations/fynn/application/ports/fynn-client';
import type {
  FynnSnapshot,
  FynnSubscription,
  FynnSubscriptionSummary,
} from 'src/integrations/fynn/application/models/fynn-snapshot';
import {
  InvalidFynnStateError,
  FynnEntitlementsPendingError,
} from 'src/integrations/fynn/application/fynn.errors';
import {
  fynnEntitlementsGrantAccess,
  activeEntitlements,
  fynnSubscriptionServesAccess,
  getFynnOrgId,
} from './map-fynn-subscription';

@Injectable()
export class LoadFynnSnapshotService {
  constructor(private readonly client: FynnClient) {}

  async load(subscriptionId: string, orgId: UUID): Promise<FynnSnapshot> {
    const subscription = await this.client.getSubscription(subscriptionId);
    const customer = await this.client.getCustomer(subscription.customer.id);
    if (getFynnOrgId(customer) !== orgId)
      throw new InvalidFynnStateError(
        'Fynn organization link changed during synchronization',
      );
    const candidates = await this.servingSubscriptions(orgId, subscription);
    const serving =
      candidates.length > 1
        ? await this.withActiveEntitlements(candidates)
        : candidates;
    if (serving.length > 1)
      throw new InvalidFynnStateError(
        'Multiple serving Fynn subscriptions for one Core organization',
      );
    const authoritative = serving[0] ?? subscription;
    if (authoritative.id === subscription.id)
      return this.snapshot(subscription, customer);
    const fresh = await this.client.getSubscription(authoritative.id);
    const freshCustomer = await this.client.getCustomer(fresh.customer.id);
    if (
      getFynnOrgId(freshCustomer) !== orgId ||
      !fynnSubscriptionServesAccess(fresh, new Date())
    ) {
      throw new FynnEntitlementsPendingError();
    }
    return this.snapshot(fresh, freshCustomer);
  }

  private async withActiveEntitlements(
    candidates: FynnSubscriptionSummary[],
  ): Promise<FynnSubscription[]> {
    const serving: FynnSubscription[] = [];
    let provisioning = false;
    for (const candidate of candidates) {
      const subscription = await this.client.getSubscription(candidate.id);
      if (!fynnSubscriptionServesAccess(subscription, new Date())) continue;
      const entitlements = await this.client.getEntitlements(subscription.id);
      try {
        const active = activeEntitlements(
          { subscription, entitlements },
          new Date(),
        );
        if (fynnEntitlementsGrantAccess(active)) serving.push(subscription);
      } catch (error) {
        if (!(error instanceof FynnEntitlementsPendingError)) throw error;
        provisioning = true;
      }
    }
    if (serving.length === 0 && provisioning)
      throw new FynnEntitlementsPendingError();
    return serving;
  }

  private async servingSubscriptions(
    orgId: UUID,
    trigger: FynnSubscription,
  ): Promise<FynnSubscriptionSummary[]> {
    const customers = fynnCustomersForOrg(
      await this.client.listCustomerLinks(),
      orgId,
    );
    if (!customers.some((customer) => customer.id === trigger.customer.id))
      throw new InvalidFynnStateError(
        'Fynn customer listing is inconsistent with its organization link',
      );
    const all: FynnSubscriptionSummary[] = [];
    for (const customer of customers) {
      const subscriptions = await this.client.listSubscriptions(customer.id);
      if (
        subscriptions.some(
          (subscription) => subscription.customer.id !== customer.id,
        )
      )
        throw new InvalidFynnStateError(
          'Fynn returned a subscription for a different customer',
        );
      all.push(...subscriptions);
    }
    if (!all.some((subscription) => subscription.id === trigger.id))
      throw new FynnEntitlementsPendingError();
    const unique = new Map(
      all.map((subscription) => [subscription.id, subscription]),
    );
    unique.set(trigger.id, trigger);
    return [...unique.values()].filter((subscription) =>
      fynnSubscriptionServesAccess(subscription, new Date()),
    );
  }

  private async snapshot(
    subscription: FynnSubscription,
    customer: FynnSnapshot['customer'],
  ): Promise<FynnSnapshot> {
    const entitlements = fynnSubscriptionServesAccess(subscription, new Date())
      ? await this.client.getEntitlements(subscription.id)
      : [];
    return { subscription, customer, entitlements };
  }
}
