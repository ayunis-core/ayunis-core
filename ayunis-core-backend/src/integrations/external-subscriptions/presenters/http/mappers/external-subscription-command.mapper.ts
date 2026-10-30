import type { UUID } from 'crypto';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import type { ExternalSubscriptionCommand } from 'src/integrations/external-subscriptions/application/models/external-subscription-command';
import { InvalidExternalSubscriptionError } from 'src/integrations/external-subscriptions/application/external-subscription.errors';
import type {
  ApplyExternalSubscriptionDto,
  ExternalSubscriptionDataDto,
} from 'src/integrations/external-subscriptions/presenters/http/dto/external-subscription.dto';

function subscription(data: ExternalSubscriptionDataDto) {
  const base = {
    startsAt: new Date(data.startsAt),
    cancelledAt: data.cancelledAt === null ? null : new Date(data.cancelledAt),
    endsAt: data.endsAt === null ? null : new Date(data.endsAt),
    billingInfo: data.billingInfo,
  };
  if (
    data.type === SubscriptionType.SEAT_BASED &&
    data.noOfSeats !== undefined &&
    data.monthlyCredits === undefined
  )
    return {
      ...base,
      type: SubscriptionType.SEAT_BASED as const,
      noOfSeats: data.noOfSeats,
    };
  if (
    data.type === SubscriptionType.USAGE_BASED &&
    data.monthlyCredits !== undefined &&
    data.noOfSeats === undefined
  )
    return {
      ...base,
      type: SubscriptionType.USAGE_BASED as const,
      monthlyCredits: data.monthlyCredits,
    };
  throw new InvalidExternalSubscriptionError(
    'Subscription must contain exactly one allowance matching its access model',
  );
}
export function toExternalSubscriptionCommand(
  orgId: UUID,
  data: ApplyExternalSubscriptionDto,
): ExternalSubscriptionCommand {
  return {
    orgId,
    revision: data.revision as UUID,
    ownerId: data.ownerId,
    subscription:
      data.subscription === null ? null : subscription(data.subscription),
    academyActive: data.academyActive,
    revoke: data.revoke,
  };
}
