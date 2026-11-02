import type { UUID } from 'crypto';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import type { SubscriptionSyncCommand } from 'src/integrations/core-connect/subscription-sync/application/models/subscription-sync-command';
import { InvalidSubscriptionSyncError } from 'src/integrations/core-connect/subscription-sync/application/subscription-sync.errors';
import type {
  ApplyExternalSubscriptionDto,
  ExternalSubscriptionDataDto,
} from 'src/integrations/core-connect/subscription-sync/presenters/http/dto/subscription-sync.dto';

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
  throw new InvalidSubscriptionSyncError(
    'Subscription must contain exactly one allowance matching its access model',
  );
}
// Optional delivery metadata is dropped, never rejected, when it is unsafe to log.
const SAFE_DELIVERY_ID = /^[\x21-\x7e]{1,200}$/;

export function toSubscriptionSyncCommand(
  orgId: UUID,
  data: ApplyExternalSubscriptionDto,
  deliveryId?: string,
): SubscriptionSyncCommand {
  const command: SubscriptionSyncCommand = {
    orgId,
    revision: data.revision as UUID,
    ownerId: data.ownerId,
    subscription:
      data.subscription === null ? null : subscription(data.subscription),
    academyActive: data.academyActive,
    revoke: data.revoke,
  };
  if (deliveryId !== undefined && SAFE_DELIVERY_ID.test(deliveryId))
    command.deliveryId = deliveryId;
  return command;
}
