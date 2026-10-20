import type { UUID } from 'crypto';
import { isUUID } from 'class-validator';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import type {
  SubscriptionSyncState,
  SubscriptionSyncData,
} from 'src/iam/subscriptions/application/models/subscription-sync-state';
import type {
  FynnCustomer,
  FynnEntitlement,
  FynnSnapshot,
  FynnSubscription,
} from 'src/integrations/fynn/application/models/fynn-snapshot';
import {
  FynnEntitlementsPendingError,
  InvalidFynnStateError,
} from 'src/integrations/fynn/application/fynn.errors';

export function getFynnOrgId(customer: FynnCustomer): UUID {
  const value = Array.isArray(customer.customFields)
    ? undefined
    : customer.customFields['ayunis-core-uuid'];
  if (typeof value !== 'string' || !isUUID(value)) {
    throw new InvalidFynnStateError(
      'Fynn customer has no valid Core organization UUID',
    );
  }
  return value.toLowerCase() as UUID;
}

export function fynnSubscriptionServesAccess(
  subscription: FynnSubscription,
  now: Date,
): boolean {
  if (subscription.status === 'active') return true;
  if (subscription.status === 'cancelled') {
    return date(subscription.cancellationDate, 'cancellation date') > now;
  }
  if (
    ['terminated', 'voided', 'paused', 'draft', 'offer'].includes(
      subscription.status,
    )
  )
    return false;
  throw new InvalidFynnStateError('Unknown Fynn subscription status');
}

export function mapFynnSubscription(
  snapshot: FynnSnapshot,
  now: Date,
): SubscriptionSyncState {
  const orgId = getFynnOrgId(snapshot.customer);
  if (!fynnSubscriptionServesAccess(snapshot.subscription, now)) {
    return { orgId, subscription: null, academyActive: false };
  }
  const active = snapshot.entitlements.filter(
    (entitlement) => entitlement.status === 'active',
  );
  if (active.length === 0) throw new FynnEntitlementsPendingError();
  const typeValues = valuesForFeature(active, 'core-subscription-type');
  const types = new Set(typeValues.map((entitlement) => entitlement.value));
  if (
    types.size > 1 ||
    [...types].some((value) => value !== 'seat' && value !== 'usage')
  ) {
    throw new InvalidFynnStateError('Ambiguous Fynn subscription type');
  }
  const subscription = subscriptionData(snapshot);
  if (types.has('seat')) {
    subscription.type = SubscriptionType.SEAT_BASED;
    subscription.noOfSeats = seats(snapshot.subscription, typeValues);
  } else {
    subscription.monthlyCredits = credits(active);
  }
  const academyActive = valuesForFeature(active, 'core-academy').some(
    (entitlement) => entitlement.value === true || entitlement.value === 'true',
  );
  return { orgId, subscription, academyActive };
}

function subscriptionData(snapshot: FynnSnapshot): SubscriptionSyncData {
  const { subscription, customer } = snapshot;
  const address = customer.defaultAddress;
  if (!address)
    throw new InvalidFynnStateError(
      'Fynn customer has no default billing address',
    );
  const cancelled = subscription.status === 'cancelled';
  return {
    type: SubscriptionType.USAGE_BASED,
    startsAt: date(
      subscription.contractDetails.contractStart ?? subscription.activatedAt,
      'contract start',
    ),
    cancelledAt: cancelled
      ? date(subscription.cancelledAt, 'cancellation timestamp')
      : null,
    accessEndsAt: cancelled
      ? date(subscription.cancellationDate, 'cancellation date')
      : null,
    billingInfo: {
      companyName: address.companyName || customer.companyName,
      street: address.street,
      houseNumber: address.houseNumber,
      postalCode: address.zip,
      city: address.city,
      country: address.countryCode,
      vatNumber: address.vatId || undefined,
    },
  };
}

function valuesForFeature(
  entitlements: FynnEntitlement[],
  id: string,
): FynnEntitlement[] {
  const matching = entitlements.filter(
    (entitlement) => entitlement.feature.id === id,
  );
  const overrides = matching.filter(
    (entitlement) => entitlement.subscriptionItem === null,
  );
  if (overrides.length > 1)
    throw new InvalidFynnStateError(`Multiple Fynn overrides for ${id}`);
  return overrides.length > 0 ? overrides : matching;
}

function credits(entitlements: FynnEntitlement[]): number {
  const values = ['core-monthly-credits', 'core-additional-credits'].flatMap(
    (id) => valuesForFeature(entitlements, id),
  );
  if (values.length === 0) throw new FynnEntitlementsPendingError();
  const total = values.reduce(
    (sum, entitlement) => sum + integer(entitlement.value, 'credit'),
    0,
  );
  if (!Number.isSafeInteger(total) || total <= 0) {
    throw new InvalidFynnStateError(
      'Fynn monthly credits must be a positive safe integer',
    );
  }
  return total;
}

function seats(
  subscription: FynnSubscription,
  types: FynnEntitlement[],
): number {
  const itemIds = new Set(
    types.map((entitlement) => entitlement.subscriptionItem?.id),
  );
  const items = subscription.items.filter((item) => itemIds.has(item.id));
  if (items.length !== 1)
    throw new InvalidFynnStateError(
      'Fynn seat product must resolve to one item',
    );
  const count = integer(items[0].currentMeasurementValue?.quantity, 'seat');
  if (count === 0)
    throw new InvalidFynnStateError('Fynn seat count must be positive');
  return count;
}

function integer(value: unknown, label: string): number {
  if (
    typeof value !== 'number' &&
    !(typeof value === 'string' && /^\d+(?:\.0+)?$/.test(value))
  ) {
    throw new InvalidFynnStateError(`Invalid Fynn ${label} value`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0)
    throw new InvalidFynnStateError(`Invalid Fynn ${label} value`);
  return parsed;
}

function date(value: string | null, label: string): Date {
  if (!value) throw new InvalidFynnStateError(`Missing Fynn ${label}`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()))
    throw new InvalidFynnStateError(`Invalid Fynn ${label}`);
  return parsed;
}
